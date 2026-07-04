import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getTranscription, countFillerWords } from "@/lib/assemblyai-client";
import { coachRehearsalTake } from "@/lib/rehearsal-coaching";
import type { AssessmentScores } from "@/lib/ai-assessment-analysis";

export const dynamic = "force-dynamic";

const DURATION_LIMITS: Record<string, number> = {
  pro: 1200,   // 20 min — Pro subscribers and org members
  admin: 1200, // 20 min — internal
  lite: 300,   // 5 min
  free: 300,   // 5 min
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; takeId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId, takeId } = await params;
  const db = getAdminDb();

  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const takeRef = sessionRef.collection("takes").doc(takeId);
  const takeSnap = await takeRef.get();
  if (!takeSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const takeData = takeSnap.data()!;

  if (takeData.status === "complete" || takeData.status === "failed") {
    return NextResponse.json({ ...takeData, takeId });
  }

  if (!takeData.assemblyAiId) {
    return NextResponse.json({ status: takeData.status ?? "queued", takeId });
  }

  let transcript;
  try {
    transcript = await getTranscription(takeData.assemblyAiId as string);
  } catch (err) {
    console.error("[rehearsal/takeId] AssemblyAI poll failed:", err);
    return NextResponse.json({ status: "processing", takeId });
  }

  if (transcript.status === "error") {
    await takeRef.update({ status: "failed", error: transcript.error ?? "AssemblyAI error" });
    return NextResponse.json({ status: "failed", error: transcript.error, takeId });
  }

  if (transcript.status !== "completed") {
    return NextResponse.json({ status: "processing", takeId });
  }

  const audioDurationSeconds = transcript.audio_duration ?? 0;
  const sessionTier = (sessionSnap.data()!.tier as string | undefined) ?? "free";
  const maxDuration = DURATION_LIMITS[sessionTier] ?? 300;
  if (audioDurationSeconds > maxDuration) {
    await takeRef.update({ status: "failed", error: "duration_exceeded" });
    return NextResponse.json({ status: "failed", error: "duration_exceeded", takeId });
  }

  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(takeRef);
    if (fresh.data()?.status !== "processing") return false;
    tx.update(takeRef, { status: "analyzing" });
    return true;
  });
  if (!claimed) {
    return NextResponse.json({ status: "processing", takeId });
  }

  const words = transcript.words ?? [];
  const wordCount = words.length;
  const fillerWordCount = countFillerWords(words);

  const sentiments = transcript.sentiment_analysis_results ?? [];
  const total = sentiments.length || 1;
  const positivePercent = Math.round(
    (sentiments.filter((s) => s.sentiment === "POSITIVE").length / total) * 100
  );
  const negativePercent = Math.round(
    (sentiments.filter((s) => s.sentiment === "NEGATIVE").length / total) * 100
  );
  const neutralPercent = 100 - positivePercent - negativePercent;

  const takeNumber = takeData.takeNumber as number;
  const languageCode = transcript.language_code ?? "en";

  // Fetch previous take for comparison if this isn't Take 1
  let previousTake = null;
  if (takeNumber > 1) {
    const allTakesSnap = await sessionRef.collection("takes")
      .where("takeNumber", "==", takeNumber - 1)
      .limit(1)
      .get();
    if (!allTakesSnap.empty) {
      const prev = allTakesSnap.docs[0].data();
      if (prev.scores) {
        previousTake = {
          takeNumber: takeNumber - 1,
          scores: prev.scores as AssessmentScores,
        };
      }
    }
  }

  // Pass context from session doc down to the coaching function
  const sessionContextId = (sessionSnap.data()!.contextId as string | undefined) ?? "general";

  let coaching;
  try {
    coaching = await coachRehearsalTake({
      transcript: transcript.text ?? "",
      audioDurationSeconds,
      wordCount,
      fillerWordCount,
      positivePercent,
      neutralPercent,
      negativePercent,
      takeNumber,
      previousTake,
      locale: languageCode,
      contextId: sessionContextId,
    });
  } catch (err) {
    console.error("[rehearsal/takeId] Coaching failed:", err);
    await takeRef.update({ status: "failed", error: "coaching_failed" });
    return NextResponse.json({ status: "failed", error: "coaching_failed", takeId });
  }

  const update = {
    status: "complete",
    completedAt: Timestamp.fromDate(new Date()),
    audioDurationSeconds,
    wordCount,
    fillerWordCount,
    wordsPerMinute:
      audioDurationSeconds > 0
        ? Math.round((wordCount / audioDurationSeconds) * 60)
        : 0,
    languageCode,
    transcriptText: transcript.text ?? "",
    scores: coaching.scores,
    comparison: coaching.comparison,
    strength: coaching.strength,
    coaching: coaching.coaching,
    nextFocus: coaching.nextFocus,
    encouragement: coaching.encouragement,
  };

  await takeRef.update(update);
  return NextResponse.json({ ...update, takeId });
}
