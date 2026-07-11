import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { extractCueCard, CueCardExtractionError } from "./cue-card-service";
import { logEvent } from "@/lib/telemetry";

/**
 * Shared by the manual cue-card API route and the automatic trigger fired
 * after a highest-scoring fullrun completes. Admin-SDK, not a pure function.
 */
export async function generateAndSaveCueCard(args: {
  planId: string;
  userId: string;
  rehearsalSessionId: string;
  takeId: string;
  transcriptText: string;
  locale: string;
  user_key: string;
}): Promise<{ cardId: string; lines: string[] } | { error: "extraction_failed" }> {
  const db = getAdminDb();

  let lines;
  try {
    lines = await extractCueCard({ transcript: args.transcriptText, locale: args.locale });
  } catch (err) {
    if (err instanceof CueCardExtractionError) {
      logEvent("gameday.cue_card_extraction_failed", {
        user_key: args.user_key,
        payload: { planId: args.planId, reason: err.message },
      });
      return { error: "extraction_failed" };
    }
    throw err;
  }

  const cardRef = db.collection("cueCards").doc();
  const now = Timestamp.fromDate(new Date());
  const cardLines = [lines.openingLine, lines.anchors[0], lines.anchors[1], lines.anchors[2], lines.closingLine];
  await cardRef.set({
    planId: args.planId,
    userId: args.userId,
    extractedFromRehearsalSessionId: args.rehearsalSessionId,
    extractedFromTakeId: args.takeId,
    lines: cardLines,
    taperAdvisory: false,
    updatedAt: now,
  });
  await db.collection("plans").doc(args.planId).update({ cueCardId: cardRef.id });

  logEvent("gameday.cue_card_generated", { user_key: args.user_key, payload: { planId: args.planId, cardId: cardRef.id } });

  return { cardId: cardRef.id, lines: cardLines };
}

/**
 * Composite score used only to compare "is this fullrun better than the one
 * the current cue card came from" — a simple average, not a display metric.
 */
export function compositeScore(scores: { clarity: number; energy: number; engagement: number; understanding: number; connection: number }): number {
  return (scores.clarity + scores.energy + scores.engagement + scores.understanding + scores.connection) / 5;
}

/**
 * Returns true if a fullrun's cue card should be (re)generated from this
 * take: either no cue card exists yet for the plan, or this take's composite
 * score beats the one the current cue card was extracted from. Per spec:
 * "after the highest-scoring fullrun."
 */
export async function shouldGenerateCueCard(args: {
  planId: string;
  thisComposite: number;
}): Promise<boolean> {
  const db = getAdminDb();
  const planSnap = await db.collection("plans").doc(args.planId).get();
  const existingCueCardId = planSnap.data()?.cueCardId as string | undefined;
  if (!existingCueCardId) return true;

  const cardSnap = await db.collection("cueCards").doc(existingCueCardId).get();
  const sourceSessionId = cardSnap.data()?.extractedFromRehearsalSessionId as string | undefined;
  const sourceTakeId = cardSnap.data()?.extractedFromTakeId as string | undefined;
  if (!sourceSessionId || !sourceTakeId) return true;

  const sourceTakeSnap = await db
    .collection("rehearsal_sessions")
    .doc(sourceSessionId)
    .collection("takes")
    .doc(sourceTakeId)
    .get();
  const sourceScores = sourceTakeSnap.data()?.scores;
  if (!sourceScores) return true;

  return args.thisComposite > compositeScore(sourceScores);
}
