import { getAdminDb } from "./firebase-admin";

/**
 * The active scoring version ID.
 *
 * STANDING CONVENTION: Any change to the scoring prompt, model, or rubric
 * REQUIRES registering a new version here AND in Firestore BEFORE deployment.
 * Run: node scripts/seed-scoring-version.mjs <new-version-id>
 *
 * Bump format: sv_YYYY_MM_vN  (e.g. sv_2026_07_v1, sv_2026_09_v2)
 */
export const ACTIVE_SCORING_VERSION = "sv_2026_07_v1";

/**
 * Returns the Firestore document path for the active scoring version.
 * Warns loudly if the doc doesn't exist — never throws, never blocks scoring.
 */
export async function getActiveScoringVersionRef(): Promise<string> {
  const ref = `scoring_versions/${ACTIVE_SCORING_VERSION}`;
  try {
    const db = getAdminDb();
    const snap = await db.doc(ref).get();
    if (!snap.exists) {
      console.error(
        `[scoring-version] MISSING: ${ref} not found in Firestore. ` +
          "Run: node scripts/seed-scoring-version.mjs to register it."
      );
    }
  } catch (err) {
    console.error("[scoring-version] could not verify version doc:", err);
  }
  return ref;
}
