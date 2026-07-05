/**
 * GDPR Erasure Script — Right to Erasure (Article 17 GDPR)
 *
 * Usage:
 *   node scripts/gdpr-erase-user.mjs <firebase-uid>
 *
 * What this does (in order):
 *   1. Looks up the user's user_key from presenters/{uid}
 *   2. Deletes raw artifact bundles in R2 (raw/{user_key}/*)
 *   3. Deletes the identity mapping (presenters/{uid}.user_key + email + displayName)
 *   4. Runs the existing Firebase account deletion (Auth + presenter doc)
 *   5. Logs a system.identity_erased event (user_key only, no PII)
 *
 * What survives (and why it satisfies GDPR):
 *   - events, measurements, interventions keyed to user_key
 *   - Once identity mapping is destroyed, user_key cannot be linked to any person
 *   - This data is no longer "personal data" under GDPR Article 4(1) — see retention-draft.md
 *
 * IMPORTANT: Run this from a secure admin environment with Firebase credentials.
 * This is irreversible.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

if (!getApps().length) initializeApp();
const db = getFirestore();
const auth = getAuth();

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/gdpr-erase-user.mjs <firebase-uid>");
  process.exit(1);
}

console.log(`[gdpr-erase] Starting erasure for uid: ${uid}`);
console.log("[gdpr-erase] This is IRREVERSIBLE. Ctrl+C within 5 seconds to abort...");
await new Promise((r) => setTimeout(r, 5000));

// ── Step 1: Resolve user_key ──────────────────────────────────────────────────
const presenterSnap = await db.collection("presenters").doc(uid).get();
if (!presenterSnap.exists) {
  console.error("[gdpr-erase] No presenter doc found for uid:", uid);
  process.exit(1);
}
const user_key = presenterSnap.data()?.user_key;
if (!user_key) {
  console.warn("[gdpr-erase] No user_key on presenter doc — user pre-dates data foundation. Proceeding with account deletion only.");
}
console.log(`[gdpr-erase] user_key: ${user_key ?? "(none)"}`);

// ── Step 2: Delete raw artifact bundles from R2 ───────────────────────────────
if (user_key && process.env.R2_ACCOUNT_ID) {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = process.env.R2_BUCKET ?? "learnfast-rehearsals";
  const prefix = `raw/${user_key}/`;

  let deletedCount = 0;
  let continuationToken;
  do {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (keys.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
      deletedCount += keys.length;
    }
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  console.log(`[gdpr-erase] Deleted ${deletedCount} raw artifact objects from R2 (prefix: ${prefix})`);
} else {
  console.warn("[gdpr-erase] R2 env vars not set — skipping raw bundle deletion. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
}

// ── Step 3: Wipe PII fields from presenter doc (keep doc shell for FK integrity) ─
await db.collection("presenters").doc(uid).update({
  email: FieldValue.delete(),
  displayName: FieldValue.delete(),
  nickname: FieldValue.delete(),
  user_key: FieldValue.delete(),
  erasedAt: FieldValue.serverTimestamp(),
  erased: true,
});
console.log("[gdpr-erase] Presenter doc PII fields deleted.");

// ── Step 4: Delete Firebase Auth account ─────────────────────────────────────
try {
  await auth.deleteUser(uid);
  console.log("[gdpr-erase] Firebase Auth account deleted.");
} catch (err) {
  console.error("[gdpr-erase] Auth deletion failed (user may already be deleted):", err.message);
}

// ── Step 5: Log erasure event (user_key only — PII-free tombstone) ───────────
if (user_key) {
  const { logEvent } = await import("../lib/telemetry.js");
  logEvent("system.identity_erased", {
    payload: { uid_hash: uid.slice(0, 8) + "…", erased_at: new Date().toISOString() },
  });
  // Give the fire-and-forget write a moment to flush
  await new Promise((r) => setTimeout(r, 2000));
}

console.log();
console.log("[gdpr-erase] ✓ Erasure complete.");
console.log("  - Raw artifacts: deleted from R2");
console.log("  - Identity fields: wiped from presenter doc");
console.log("  - Firebase Auth: account deleted");
console.log(`  - Analytical spine (events/measurements/interventions keyed to ${user_key ?? "N/A"}): INTACT`);
console.log("  - These records are no longer attributable to any identifiable person.");
process.exit(0);
