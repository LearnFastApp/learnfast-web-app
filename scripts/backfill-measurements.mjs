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
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

if (!getApps().length) initializeApp();
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

// ── Backfill ai_assessments ───────────────────────────────────────────────────
console.log("[backfill] Scanning ai_assessments...");
const assessmentsSnap = await db.collection("ai_assessments")
  .where("status", "==", "complete")
  .get();

let assessmentCount = 0;
let assessmentSkipped = 0;

for (const doc of assessmentsSnap.docs) {
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
    sequence_index: 0,
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

for (const sessionDoc of sessionsSnap.docs) {
  const sessionData = sessionDoc.data();
  const presenterId = sessionData.presenterId;
  if (!presenterId) { takeSkipped++; continue; }

  const takesSnap = await sessionDoc.ref.collection("takes")
    .where("status", "==", "complete")
    .get();

  for (const takeDoc of takesSnap.docs) {
    const takeData = takeDoc.data();
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
      sequence_index: 0,
      backfilled: true,
      source_ref,
      schema_version: 1,
    };

    if (!DRY_RUN) {
      await db.collection("measurements").doc(measurement_id).set(measurement);
    }
    takeCount++;
  }
}

console.log(`[backfill] Rehearsal takes: ${takeCount} backfilled, ${takeSkipped} skipped.`);
console.log();
console.log("[backfill] Done. Note: backfilled measurements have sequence_index=0.");
console.log("  Run a one-time repair query in BigQuery to re-assign sequence_index by ts order.");
process.exit(0);
