import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { dispatchSessionSummary } from "@/lib/session-summary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const verifiedUid = await verifyAuthToken(req);
    if (!verifiedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = (await req.json()) as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const db = getAdminDb();

    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessionDoc.data()!;

    if (session.presenterId !== verifiedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (session.summarySent) {
      return NextResponse.json({ skipped: true });
    }

    // If an AI assessment is in progress, defer the email — it will fire when the
    // assessment completes (see /api/ai-assessment/[id] GET handler). The cron job
    // acts as a 24h fallback if the presenter never views the results page.
    if (session.aiAssessmentId) {
      const aiSnap = await db
        .collection("ai_assessments")
        .doc(session.aiAssessmentId as string)
        .get();
      const aiStatus = aiSnap.exists ? aiSnap.data()?.status : null;

      if (aiStatus === "processing" || aiStatus === "queued") {
        await db.collection("sessions").doc(sessionId).update({ summaryPendingAi: true });
        return NextResponse.json({ pending: true });
      }
    }

    const outcome = await dispatchSessionSummary(sessionId);
    return NextResponse.json({ sent: outcome === "sent", outcome });
  } catch (err) {
    console.error("[sessions/send-summary]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
