import { getAdminDb } from "@/lib/firebase-admin";
import { sendSummaryEmail, AiEmailInsights } from "@/lib/email";
import { generateGapInsight } from "@/lib/gap-insight";

const DIMS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMS)[number];

/**
 * Gathers all session data and sends the summary email.
 * Safe to call multiple times — skips if already sent.
 *
 * @param precomputedAiInsights - Pass when calling from the AI assessment completion
 *   path so we don't need an extra Firestore read. Omit to let this function fetch
 *   from Firestore (used by cron and immediate-send paths).
 */
export async function dispatchSessionSummary(
  sessionId: string,
  precomputedAiInsights?: AiEmailInsights,
): Promise<"sent" | "skipped" | "no_email"> {
  const db = getAdminDb();

  const sessionDoc = await db.collection("sessions").doc(sessionId).get();
  if (!sessionDoc.exists) return "skipped";
  const session = sessionDoc.data()!;
  if (session.summarySent) return "skipped";

  const presenterDoc = await db.collection("presenters").doc(session.presenterId as string).get();
  if (!presenterDoc.exists) return "skipped";
  const presenter = presenterDoc.data()!;
  const email = presenter.email as string | undefined;
  if (!email) return "no_email";

  const [responsesSnap, reflectionDoc] = await Promise.all([
    db.collection("feedback_responses").where("sessionId", "==", sessionId).get(),
    db.collection("presenter_reflections").doc(sessionId).get(),
  ]);

  const responses = responsesSnap.docs.map((d) => d.data());
  const reflection = reflectionDoc.exists ? (reflectionDoc.data() as Record<Dimension, number>) : null;

  const averages = DIMS.reduce((acc, dim) => {
    const vals = responses.map((r) => r[dim] as number).filter((v) => typeof v === "number");
    acc[dim] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return acc;
  }, {} as Record<Dimension, number>);

  const overallAvg = Math.round(DIMS.reduce((sum, d) => sum + averages[d], 0) / DIMS.length);

  const presenterLocale = (presenter.locale as string | undefined) ?? "en";
  const gapInsight =
    reflection && responses.length > 0
      ? generateGapInsight(averages, reflection, presenterLocale as "en" | "fr")
      : null;

  const dateLocaleStr = presenterLocale === "fr" ? "fr-FR" : "en-GB";
  const createdAt: Date | undefined = session.createdAt?.toDate?.();
  const sessionDate = createdAt
    ? createdAt.toLocaleDateString(dateLocaleStr, { day: "numeric", month: "long", year: "numeric" })
    : "";

  // Use precomputed AI insights if provided; otherwise fetch from Firestore
  let aiInsights: AiEmailInsights | null = precomputedAiInsights ?? null;
  if (!aiInsights && session.aiAssessmentId) {
    const aiSnap = await db
      .collection("ai_assessments")
      .doc(session.aiAssessmentId as string)
      .get();
    if (aiSnap.exists) {
      const ai = aiSnap.data()!;
      if (ai.status === "complete" && ai.scores && ai.summary) {
        aiInsights = {
          assessmentId: aiSnap.id,
          summary: ai.summary as string,
          scores: ai.scores as Record<string, number>,
          primaryTip: (ai.tips as Array<{ dimension: string; tip: string }> | undefined)?.[0] ?? undefined,
        };
      }
    }
  }

  await sendSummaryEmail({
    to: email,
    presenterName: (presenter.displayName as string) || email.split("@")[0],
    sessionTitle: (session.title as string) || "Untitled session",
    sessionDate,
    responseCount: responses.length,
    averages,
    overallAvg,
    gapInsight,
    sessionUrl: `${process.env.APP_URL}/sessions/${sessionId}`,
    aiInsights,
    locale: presenterLocale,
  });

  await db.collection("sessions").doc(sessionId).update({ summarySent: true, summaryPendingAi: false });

  return "sent";
}
