import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getTranscription, countFillerWords } from "@/lib/assemblyai-client";
import { analyseTranscript } from "@/lib/ai-assessment-analysis";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  const docRef = db.collection("ai_assessments").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.presenterId !== uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = snap.data()!;

  if (data.status === "complete" || data.status === "failed") {
    return NextResponse.json({ status: data.status, ...data });
  }

  if (!data.assemblyAiId) {
    return NextResponse.json({ status: data.status });
  }

  // Check AssemblyAI status
  let transcript;
  try {
    transcript = await getTranscription(data.assemblyAiId as string);
  } catch (err) {
    console.error("[ai-assessment/get] AssemblyAI poll failed:", err);
    return NextResponse.json({ status: "processing" });
  }

  if (transcript.status === "error") {
    await docRef.update({ status: "failed", error: transcript.error ?? "AssemblyAI error" });
    return NextResponse.json({ status: "failed", error: transcript.error });
  }

  if (transcript.status !== "completed") {
    return NextResponse.json({ status: "processing" });
  }

  // AssemblyAI complete — run Claude analysis
  const words = transcript.words ?? [];
  const wordCount = words.length;
  const fillerWordCount = countFillerWords(words);
  const audioDurationSeconds = transcript.audio_duration ?? 0;

  const sentiments = transcript.sentiment_analysis_results ?? [];
  const total = sentiments.length || 1;
  const positivePercent = Math.round(sentiments.filter((s) => s.sentiment === "POSITIVE").length / total * 100);
  const negativePercent = Math.round(sentiments.filter((s) => s.sentiment === "NEGATIVE").length / total * 100);
  const neutralPercent = 100 - positivePercent - negativePercent;

  let analysis;
  try {
    analysis = await analyseTranscript({
      transcript: transcript.text ?? "",
      audioDurationSeconds,
      wordCount,
      fillerWordCount,
      positivePercent,
      neutralPercent,
      negativePercent,
    });
  } catch (err) {
    console.error("[ai-assessment/get] Claude analysis failed:", err);
    await docRef.update({ status: "failed", error: "Analysis failed" });
    return NextResponse.json({ status: "failed", error: "Analysis failed" });
  }

  const update = {
    status: "complete",
    completedAt: Timestamp.fromDate(new Date()),
    wordCount,
    fillerWordCount,
    audioDurationSeconds,
    wordsPerMinute: audioDurationSeconds > 0 ? Math.round((wordCount / audioDurationSeconds) * 60) : 0,
    scores: analysis.scores,
    rationale: analysis.rationale,
    highlights: analysis.highlights,
    tips: analysis.tips,
    summary: analysis.summary,
  };

  await docRef.update(update);
  return NextResponse.json({ ...update });
}
