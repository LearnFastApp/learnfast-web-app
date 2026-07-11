import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Marks a prescribed session complete and links it back to the rehearsal
 * take that satisfied it. Shared by the automatic-linking path (fired
 * fire-and-forget from the rehearsal take-completion route when a session
 * was started from a plan) and the free-session attribution API route.
 *
 * Admin-SDK, not a pure function — unlike the rest of lib/gameday/, this one
 * touches Firestore directly, so it has no accompanying unit test (would
 * need the emulator; covered instead by the rules tests + manual QA).
 */
export async function completePrescribedSession(args: {
  prescribedSessionId: string;
  rehearsalSessionId: string;
  takeId: string;
  userId: string;
}): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("prescribedSessions").doc(args.prescribedSessionId);
  const snap = await ref.get();
  if (!snap.exists) return; // nothing to link — best-effort, never throws
  const data = snap.data()!;
  if (data.userId !== args.userId) return; // ownership guard
  if (data.status === "completed") return; // idempotent — already linked

  await ref.update({
    status: "completed",
    completedRehearsalSessionId: args.rehearsalSessionId,
    completedTakeId: args.takeId,
    completedAt: Timestamp.fromDate(new Date()),
  });
}
