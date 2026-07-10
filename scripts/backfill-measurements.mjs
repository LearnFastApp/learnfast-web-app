/**
 * Backfill historical assessments and rehearsal takes into the measurements collection.
 *
 * Usage:
 *   node scripts/backfill-measurements.mjs [--dry-run]
 *
 * Reads all existing ai_assessments and rehearsal_sessions/takes with status "complete",
 * creates a measurement doc for each (flagged backfilled: true, scoring_version: "unknown-pre-v1"),
 * and assigns a user_key (creating one if the presenter doesn't have one).
 *
 * Safe to re-run — skips assessments already backfilled (checks for existing measurement
 * with matching source_ref).
 *
 * NOTE ON lib/measurement-writer.ts: this script intentionally does NOT import that
 * module. It's plain TypeScript run directly by `node` here with no bundler — Node's
 * type-stripping handles the syntax, but not this repo's `@/` path aliases or
 * extensionless local imports, so `lib/measurement-writer.ts` (which imports
 * `./firebase-admin` etc.) can't resolve under plain `node` without adding a loader/
 * build step. The measurement doc shape below is kept in sync with that writer by
 * hand — if `writeMeasurement`'s schema changes, update this script to match.
 */

import { readFileSync } from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL("../.firebaserc", import.meta.url), "utf8")).projects.default;

if (!getApps().length) initializeApp({ projectId });
const db = getFirestore();

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("[backfill] DRY RUN — no writes will occur.");

async function getOrCreateUserKey(uid) {
  const ref = db.collection("presenters").doc(uid);
  const snap = await ref.get();
  const existing = snap.data()?.user_key;
  if (existing) return existing;
  const user_key = randomUUID();
  if (!DRY_RUN) await ref.set({ user_key }, { merge: true });
  return user_key;
}

async function alreadyBackfilled(source_ref) {
  const snap = await db.collection("measurements")
    .where("source_ref", "==", source_ref)
    .limit(1)
    .get();
  return !snap.empty;
}

// Mirrors writeMeasurement's atomic sequence numbering (lib/measurement-writer.ts) —
// nth measurement of this kind for this user_key, counting what's already written
// (including earlier docs from this same backfill run).
// IMPORTANT: only produces correct chronological numbering if callers process
// records for each user_key oldest-first — the loops below sort by timestamp
// before calling this for exactly that reason.
async function nextSequenceIndex(user_key, kind) {
  const countSnap = await db
    .collection("measurements")
    .where("user_key", "==", user_key)
    .where("kind", "==", kind)
    .count()
    .get();
  return countSnap.data().count + 1;
}

// ── Backfill ai_assessments ───────────────────────────────────────────────────
console.log("[backfill] Scanning ai_assessments...");
const assessmentsSnap = await db.collection("ai_assessments")
  .where("status", "==", "complete")
  .get();

function tsMillis(data, ...fields) {
  for (const f of fields) {
    const v = data[f]?.toDate?.();
    if (v) return v.getTime();
  }
  return 0;
}

// Sort oldest-first per presenter so nextSequenceIndex() numbers chronologically
// rather than in arbitrary Firestore fetch order.
const sortedAssessmentDocs = [...assessmentsSnap.docs].sort(
  (a, b) => tsMillis(a.data(), "completedAt", "createdAt") - tsMillis(b.data(), "completedAt", "createdAt")
);

let assessmentCount = 0;
let assessmentSkipped = 0;

for (const doc of sortedAssessmentDocs) {
  const data = doc.data();
  const presenterId = data.presenterId;
  if (!presenterId || data.isGuest) {
    assessmentSkipped++;
    continue;
  }
  if (await alreadyBackfilled(`ai_assessments/${doc.id}`)) {
    assessmentSkipped++;
    continue;
  }
  if (!data.scores) {
    assessmentSkipped++;
    continue;
  }

  const user_key = await getOrCreateUserKey(presenterId);
  const measurement_id = randomUUID();
  const composite = Math.round(
    ((data.scores.clarity ?? 0) + (data.scores.energy ?? 0) + (data.scores.engagement ?? 0) +
     (data.scores.understanding ?? 0) + (data.scores.connection ?? 0)) / 5
  );

  const measurement = {
    measurement_id,
    user_key,
    org_id: data.orgId ?? null,
    kind: "ai_assessment",
    ts: data.completedAt ?? data.createdAt ?? FieldValue.serverTimestamp(),
    context: {
      assessment_type: data.contextId ?? "general",
      duration_seconds: data.audioDurationSeconds ?? 0,
      locale: data.userLocale ?? "en",
    },
    scores: { ...data.scores, composite },
    archetype: data.archetype ?? null,
    scoring_version_ref: "scoring_versions/unknown-pre-v1",
    signal: "ai",
    raw_ref: null,
    sequence_index: await nextSequenceIndex(user_key, "ai_assessment"),
    backfilled: true,
    source_ref: `ai_assessments/${doc.id}`,
    schema_version: 1,
  };

  if (!DRY_RUN) {
    await db.collection("measurements").doc(measurement_id).set(measurement);
  }
  assessmentCount++;
  if (assessmentCount % 50 === 0) console.log(`  ...${assessmentCount} assessments processed`);
}

console.log(`[backfill] Assessments: ${assessmentCount} backfilled, ${assessmentSkipped} skipped.`);

// ── Backfill rehearsal takes ──────────────────────────────────────────────────
console.log("[backfill] Scanning rehearsal_sessions...");
const sessionsSnap = await db.collection("rehearsal_sessions").get();

let takeCount = 0;
let takeSkipped = 0;

// Flatten every take across every session first — a presenter's takes are spread
// across multiple session docs, so per-presenter chronological order can only be
// established after gathering everything, not session-by-session.
const allTakes = [];
for (const sessionDoc of sessionsSnap.docs) {
  const sessionData = sessionDoc.data();
  const presenterId = sessionData.presenterId;
  if (!presenterId) { takeSkipped++; continue; }

  const takesSnap = await sessionDoc.ref.collection("takes")
    .where("status", "==", "complete")
    .get();

  for (const takeDoc of takesSnap.docs) {
    allTakes.push({ sessionDoc, sessionData, presenterId, takeDoc, takeData: takeDoc.data() });
  }
}

const sortedTakes = allTakes.sort(
  (a, b) => tsMillis(a.takeData, "completedAt") - tsMillis(b.takeData, "completedAt")
);

for (const { sessionDoc, sessionData, presenterId, takeDoc, takeData } of sortedTakes) {
    const source_ref = `rehearsal_sessions/${sessionDoc.id}/takes/${takeDoc.id}`;

    if (await alreadyBackfilled(source_ref)) { takeSkipped++; continue; }
    if (!takeData.scores) { takeSkipped++; continue; }

    const user_key = await getOrCreateUserKey(presenterId);
    const measurement_id = randomUUID();
    const composite = Math.round(
      ((takeData.scores.clarity ?? 0) + (takeData.scores.energy ?? 0) + (takeData.scores.engagement ?? 0) +
       (takeData.scores.understanding ?? 0) + (takeData.scores.connection ?? 0)) / 5
    );

    const measurement = {
      measurement_id,
      user_key,
      org_id: sessionData.orgId ?? null,
      kind: "rehearsal_take",
      ts: takeData.completedAt ?? FieldValue.serverTimestamp(),
      context: {
        assessment_type: sessionData.contextId ?? "general",
        duration_seconds: takeData.audioDurationSeconds ?? 0,
        locale: takeData.languageCode ?? "en",
        take_number: takeData.takeNumber ?? null,
      },
      scores: { ...takeData.scores, composite },
      archetype: null,
      scoring_version_ref: "scoring_versions/unknown-pre-v1",
      signal: "ai",
      raw_ref: null,
      sequence_index: await nextSequenceIndex(user_key, "rehearsal_take"),
      backfilled: true,
      source_ref,
      schema_version: 1,
    };

    if (!DRY_RUN) {
      await db.collection("measurements").doc(measurement_id).set(measurement);
    }
    takeCount++;
}

console.log(`[backfill] Rehearsal takes: ${takeCount} backfilled, ${takeSkipped} skipped.`);
console.log();
console.log("[backfill] Done. sequence_index was assigned chronologically per user_key during this run.");
process.exit(0);
