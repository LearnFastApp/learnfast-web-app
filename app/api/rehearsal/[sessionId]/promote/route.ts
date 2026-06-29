import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();

  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const takeId = typeof body.takeId === "string" ? body.takeId : null;
  if (!takeId) return NextResponse.json({ error: "missing_takeId" }, { status: 400 });

  const takeRef = sessionRef.collection("takes").doc(takeId);
  const takeSnap = await takeRef.get();
  if (!takeSnap.exists || takeSnap.data()!.status !== "complete") {
    return NextResponse.json({ error: "take_not_ready" }, { status: 400 });
  }

  const take = takeSnap.data()!;
  const session = sessionSnap.data()!;

  // Copy take into ai_assessments as a proper session record
  const assessmentRef = db.collection("ai_assessments").doc();
  await assessmentRef.set({
    presenterId: uid,
    isRehearsal: true,
    rehearsalSessionId: sessionId,
    rehearsalTakeId: takeId,
    rehearsalTakeNumber: take.takeNumber,
    title: session.title || null,
    tags: session.tags || [],
    sessionId: null,
    fileName: take.fileName,
    status: "complete",
    scores: take.scores,
    rationale: null,
    highlights: [],
    tips: [],
    summary: null,
    rehearsalCoaching: {
      comparison: take.comparison,
      strength: take.strength,
      coaching: take.coaching,
      nextFocus: take.nextFocus,
      encouragement: take.encouragement,
    },
    audioDurationSeconds: take.audioDurationSeconds,
    wordCount: take.wordCount,
    fillerWordCount: take.fillerWordCount,
    wordsPerMinute: take.wordsPerMinute,
    languageCode: take.languageCode,
    createdAt: Timestamp.fromDate(new Date()),
    completedAt: take.completedAt,
  });

  await Promise.all([
    takeRef.update({ isPromoted: true }),
    sessionRef.update({
      promotedTakeId: takeId,
      promotedAssessmentId: assessmentRef.id,
      status: "completed",
    }),
  ]);

  return NextResponse.json({ success: true, assessmentId: assessmentRef.id });
}
