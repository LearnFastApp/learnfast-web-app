import type { Firestore } from "firebase-admin/firestore";

export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Free's one-time taster (`freeRehearsalUsed`) and Lite's monthly counter
 * (`rehearsalMonthlyUsage`) are both consumed eagerly at session creation —
 * before transcription/coaching is known to succeed — so that concurrent
 * session creation can't race past the limit. That means a platform-side
 * failure on take 1 (transcription error, duration limit, coaching failure,
 * a failed final save) would otherwise permanently cost the user that
 * credit for nothing. Only take 1 ever consumes quota (subsequent takes in
 * an already-paid-for session are free), so only take 1 failing warrants a
 * refund.
 */
export async function refundRehearsalQuotaIfFirstTake(
  db: Firestore,
  presenterId: string,
  tier: string,
  takeNumber: number,
  sessionCreatedAt: Date
): Promise<void> {
  if (takeNumber !== 1) return;
  const presenterRef = db.collection("presenters").doc(presenterId);
  try {
    if (tier === "free") {
      await presenterRef.update({ freeRehearsalUsed: false });
    } else if (tier === "lite") {
      const { FieldValue } = await import("firebase-admin/firestore");
      const key = `rehearsalMonthlyUsage.${monthKey(sessionCreatedAt)}`;
      await presenterRef.update({ [key]: FieldValue.increment(-1) });
    }
  } catch (err) {
    console.error("[rehearsal-gate] Quota refund failed:", err);
  }
}
