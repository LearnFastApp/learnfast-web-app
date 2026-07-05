import { randomUUID } from "crypto";
import { getAdminDb } from "./firebase-admin";

/**
 * Returns the stable pseudonymous user_key for an authenticated user.
 *
 * user_key is an opaque UUID — NOT the Firebase auth UID and NOT derivable from it.
 * It is the only identifier used in the analytical layer (events, measurements,
 * interventions). The identity collection (Phase 4) maps user_key → uid; until
 * that collection exists, the mapping is stored on presenters/{uid}.user_key.
 *
 * Creates and persists the user_key on first call.
 */
export async function getOrCreateUserKey(uid: string): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("presenters").doc(uid);
  const snap = await ref.get();
  const existing = snap.data()?.user_key as string | undefined;
  if (existing) return existing;

  const user_key = randomUUID();
  await ref.set({ user_key }, { merge: true });
  return user_key;
}
