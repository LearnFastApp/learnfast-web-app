import { getAdminDb } from "@/lib/firebase-admin";

/**
 * "I'm happy with where I'm at" — marks every still-`scheduled` prescribed
 * session on a plan as `skipped`, so the roadmap and timeline views advance
 * honestly instead of a user privately jumping to Cue Card/Warm-Up while the
 * plan keeps insisting they're still mid-build. Never touches `completed`
 * sessions. Advisory-only, matching the rest of Gameday's friction doctrine —
 * this is offered, never forced, and never framed as "you missed these."
 *
 * Admin-SDK, not a pure function — no accompanying unit test (would need the
 * emulator; covered by rules tests + manual QA), same as
 * complete-prescribed-session.ts.
 */
export async function skipRemainingPrescribedSessions(args: {
  planId: string;
  userId: string;
}): Promise<{ skippedCount: number }> {
  const db = getAdminDb();
  const scheduledSnap = await db
    .collection("prescribedSessions")
    .where("planId", "==", args.planId)
    .where("status", "==", "scheduled")
    .get();

  const toSkip = scheduledSnap.docs.filter((d) => d.data().userId === args.userId);
  if (toSkip.length === 0) return { skippedCount: 0 };

  const batch = db.batch();
  for (const doc of toSkip) {
    batch.update(doc.ref, { status: "skipped" });
  }
  await batch.commit();

  return { skippedCount: toSkip.length };
}
