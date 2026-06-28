import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getTranscription, countFillerWords } from "@/lib/assemblyai-client";
import { analyseTranscript } from "@/lib/ai-assessment-analysis";
import { classifyArchetype, ARCHETYPE_DEFS } from "@/lib/archetypes";
import { sendGuestResultsEmail } from "@/lib/email";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";

export const dynamic = "force-dynamic";

const MAX_DURATION_SECONDS = 95; // 90s + 5s grace

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getAdminDb();

  // O(1) lookup via token index
  const indexSnap = await db.collection("guest_token_index").doc(token).get();
  if (!indexSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { assessmentId } = indexSnap.data()!;

  const docRef = db.collection("ai_assessments").doc(assessmentId as string);
  const snap = await docRef.get();
  if (!snap.exists || !snap.data()?.isGuest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = snap.data()!;

  if (data.status === "complete" || data.status === "failed") {
    // Strip private fields before returning
    const { guestEmail: _email, ...safe } = data;
    void _email;
    return NextResponse.json({ ...safe, assessmentId, guestToken: token });
  }

  if (!data.assemblyAiId) {
    return NextResponse.json({ status: data.status ?? "queued" });
  }

  // Poll AssemblyAI
  let transcript;
  try {
    transcript = await getTranscription(data.assemblyAiId as string);
  } catch (err) {
    console.error("[guest-assessment/token] AssemblyAI poll failed:", err);
    return NextResponse.json({ status: "processing" });
  }

  if (transcript.status === "error") {
    await docRef.update({ status: "failed", error: transcript.error ?? "AssemblyAI error" });
    return NextResponse.json({ status: "failed", error: transcript.error });
  }

  if (transcript.status !== "completed") {
    return NextResponse.json({ status: "processing" });
  }

  // Enforce 90-second limit server-side
  const audioDurationSeconds = transcript.audio_duration ?? 0;
  if (audioDurationSeconds > MAX_DURATION_SECONDS) {
    await docRef.update({ status: "failed", error: "duration_exceeded" });
    return NextResponse.json({ status: "failed", error: "duration_exceeded" });
  }

  // Run Claude analysis
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
      locale: "en",
      industry: null,
      priorAssessments: [],
    });
  } catch (err) {
    console.error("[guest-assessment/token] Claude analysis failed:", err);
    await docRef.update({ status: "failed", error: "analysis_failed" });
    return NextResponse.json({ status: "failed", error: "analysis_failed" });
  }

  const update = {
    status: "complete",
    completedAt: Timestamp.fromDate(new Date()),
    wordCount,
    fillerWordCount,
    audioDurationSeconds,
    wordsPerMinute:
      audioDurationSeconds > 0
        ? Math.round((wordCount / audioDurationSeconds) * 60)
        : 0,
    scores: analysis.scores,
    rationale: analysis.rationale,
    highlights: analysis.highlights,
    tips: analysis.tips,
    summary: analysis.summary,
  };

  await docRef.update(update);

  // Send results email now that we have scores (fire-and-forget)
  const guestEmail = data.guestEmail as string | undefined;
  if (guestEmail && !data.guestEmailSent) {
    try {
      const scores = analysis.scores as unknown as Record<string, number>;
      const archetypeKey = classifyArchetype(
        scores as unknown as Parameters<typeof classifyArchetype>[0],
        null
      );
      const arch = ARCHETYPE_DEFS[archetypeKey];
      const sortedDims = Object.entries(scores).sort((a, b) => a[1] - b[1]);
      const [lowestKey, lowestScore] = sortedDims[0];
      await sendGuestResultsEmail({
        to: guestEmail,
        resultsUrl: `${APP_URL}/try/${token}`,
        archetypeName: arch.name.en,
        archetypeEmoji: arch.emoji,
        archetypeTagline: arch.tagline.en,
        lowestDimension: lowestKey.charAt(0).toUpperCase() + lowestKey.slice(1),
        lowestScore: Math.round(lowestScore),
        overallScore: Math.round(
          Object.values(scores).reduce((a, b) => a + b, 0) /
            Object.values(scores).length
        ),
      });
      await docRef.update({ guestEmailSent: true });
    } catch (err) {
      console.error("[guest-assessment/token] Results email failed:", err);
    }
  }

  return NextResponse.json({ ...update, assessmentId, guestToken: token });
}
