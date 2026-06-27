import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSummaryEmail } from "@/lib/email";
import { generateGapInsight } from "@/lib/gap-insight";

export const dynamic = "force-dynamic";

const DIMS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMS)[number];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(now - 72 * 60 * 60 * 1000);

  const sessionsSnap = await db.collection("sessions")
    .where("summarySent", "==", false)
    .get();

  // Filter in memory to avoid composite index requirement
  const due = sessionsSnap.docs.filter((d) => {
    const createdAt: Date | undefined = d.data().createdAt?.toDate?.();
    if (!createdAt) return false;
    return createdAt <= twentyFourHoursAgo && createdAt >= seventyTwoHoursAgo;
  });

  let sent = 0;

  for (const sessionDoc of due) {
    try {
      const session = sessionDoc.data();
      const sessionId = sessionDoc.id;

      const presenterDoc = await db.collection("presenters").doc(session.presenterId).get();
      if (!presenterDoc.exists) continue;
      const presenter = presenterDoc.data()!;
      const email = presenter.email as string | undefined;
      if (!email) continue;

      const [responsesSnap, reflectionDoc] = await Promise.all([
        db.collection("feedback_responses").where("sessionId", "==", sessionId).get(),
        db.collection("presenter_reflections").doc(sessionId).get(),
      ]);

      const responses = responsesSnap.docs.map((d) => d.data());
      const reflection = reflectionDoc.exists
        ? (reflectionDoc.data() as Record<Dimension, number>)
        : null;

      const averages = DIMS.reduce((acc, dim) => {
        const vals = responses
          .map((r) => r[dim] as number)
          .filter((v) => typeof v === "number");
        acc[dim] = vals.length
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : 0;
        return acc;
      }, {} as Record<Dimension, number>);

      const overallAvg = Math.round(
        DIMS.reduce((sum, d) => sum + averages[d], 0) / DIMS.length
      );

      const gapInsight =
        reflection && responses.length > 0
          ? generateGapInsight(averages, reflection, (presenter.locale as "en" | "fr" | undefined) ?? "en")
          : null;

      const presenterLocale = (presenter.locale as string | undefined) ?? "en";
      const dateLocaleStr = presenterLocale === "fr" ? "fr-FR" : "en-GB";
      const createdAt: Date | undefined = session.createdAt?.toDate?.();
      const sessionDate = createdAt
        ? createdAt.toLocaleDateString(dateLocaleStr, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";

      // Fetch AI assessment if this session has one
      let aiInsights = null;
      if (session.aiAssessmentId) {
        const aiSnap = await db.collection("ai_assessments").doc(session.aiAssessmentId as string).get();
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

      await db.collection("sessions").doc(sessionId).update({ summarySent: true });
      sent++;
    } catch (err) {
      console.error(`Failed to send summary for session ${sessionDoc.id}:`, err);
    }
  }

  return NextResponse.json({ sent, checked: due.length });
}
