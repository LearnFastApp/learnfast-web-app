import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getTranscription, countFillerWords } from "@/lib/assemblyai-client";
import { analyseTranscript, PriorAssessmentContext, AssessmentScores } from "@/lib/ai-assessment-analysis";
import { dispatchSessionSummary } from "@/lib/session-summary";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";
import { writeMeasurement } from "@/lib/measurement-writer";
import { prescribeIntervention } from "@/lib/intervention-writer";
import { uploadRawAssessmentBundle } from "@/lib/r2-client";

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

  // Fetch presenter locale to pass to Claude
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const locale = (presenterSnap.data()?.locale ?? "en") as "en" | "fr";

  // Fetch up to 3 prior completed assessments for comparative coaching
  const priorSnap = await db.collection("ai_assessments")
    .where("presenterId", "==", uid)
    .where("status", "==", "complete")
    .get();

  const now = Date.now();
  const priorAssessments: PriorAssessmentContext[] = priorSnap.docs
    .filter((d) => d.id !== id && d.data().scores)
    .sort((a, b) => {
      const aTs = a.data().createdAt?.toDate?.()?.getTime() ?? 0;
      const bTs = b.data().createdAt?.toDate?.()?.getTime() ?? 0;
      return bTs - aTs; // most recent first
    })
    .slice(0, 3)
    .map((d) => {
      const createdAt: Date | undefined = d.data().createdAt?.toDate?.();
      const diffDays = createdAt ? Math.round((now - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const label = diffDays < 14
        ? `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
        : `${Math.round(diffDays / 7)} week${Math.round(diffDays / 7) !== 1 ? "s" : ""} ago`;
      return { label, scores: d.data().scores as AssessmentScores };
    });

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

  // Atomically claim analysis slot — prevents duplicate Claude calls when
  // multiple poll requests arrive in the same window
  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(docRef);
    const s = fresh.data()?.status;
    if (s !== "processing") return false;
    tx.update(docRef, { status: "analyzing" });
    return true;
  });
  if (!claimed) {
    return NextResponse.json({ status: "processing" });
  }

  // AssemblyAI complete — run Claude analysis
  const words = transcript.words ?? [];
  const wordCount = words.length;
  const fillerWordCount = countFillerWords(words, transcript.language_code ?? undefined);
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
      locale,
      userLocale: (data.userLocale as string | undefined) ?? "en",
      industry: (data.industry as string | undefined) ?? null,
      priorAssessments,
      contextId: (data.contextId as string | undefined) ?? "general",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[ai-assessment/get] Claude analysis failed:", detail);
    await docRef.update({ status: "failed", error: "Analysis failed", errorDetail: detail });
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

  // ── Data Foundation: events, measurements, raw artifacts, interventions ──────
  // All writes are fire-and-forget — failures logged but never block the response.
  (async () => {
    try {
      const user_key = await getOrCreateUserKey(uid);
      const isGuest = !!(data.isGuest);

      // 1. Raw artifact bundle — upload first so measurement gets raw_ref
      const orgId = (data.orgId as string | undefined) ?? null;
      const measurement_id_for_bundle = `${docRef.id}-${Date.now()}`;
      let raw_ref: string | null = null;
      try {
        raw_ref = await uploadRawAssessmentBundle(user_key, measurement_id_for_bundle, {
          transcript_text: transcript.text ?? "",
          assemblyai_response: transcript as unknown as Record<string, unknown>,
          analysis_response: analysis as unknown as Record<string, unknown>,
        });
      } catch (storageErr) {
        console.error("[data-foundation] raw bundle upload failed:", storageErr);
      }

      // 2. Measurement record
      const measurement_id = await writeMeasurement({
        user_key,
        org_id: orgId,
        kind: "ai_assessment",
        context: {
          assessment_type: (data.contextId as string | undefined) ?? "general",
          duration_seconds: audioDurationSeconds,
          locale: locale,
        },
        scores: update.scores as { clarity: number; energy: number; engagement: number; understanding: number; connection: number },
        signal: "ai",
        raw_ref,
      });

      // 3. Funnel / measurement event
      const eventType = isGuest ? "funnel.try_completed" : "measurement.assessment_completed";
      logEvent(eventType, {
        user_key,
        org_id: orgId,
        context: { surface: "web", source: isGuest ? "try" : "dashboard" },
        payload: {
          measurement_id,
          assessment_id: docRef.id,
          context_id: (data.contextId as string | undefined) ?? "general",
          duration_seconds: audioDurationSeconds,
          words_per_minute: update.wordsPerMinute,
          scores: update.scores,
        },
      });

      // 4. Prescribe interventions from tips (lowest-scoring dimensions)
      const tips = (analysis.tips ?? []) as Array<{ dimension: string; tip: string }>;
      for (const tip of tips.slice(0, 3)) {
        prescribeIntervention({
          user_key,
          kind: "archetype_tip",
          target_dimension: tip.dimension as "clarity" | "energy" | "engagement" | "understanding" | "connection" | "general",
          source: "ai_report",
          content_ref: tip.tip.slice(0, 120),
          triggered_by_measurement: `measurements/${measurement_id}`,
        }).catch(() => {});
      }

      // Lowest dimension → improvement_focus intervention
      const scores = update.scores as unknown as Record<string, number>;
      const dims = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
      const lowest = dims.reduce((a, b) => (scores[a] ?? 100) < (scores[b] ?? 100) ? a : b);
      prescribeIntervention({
        user_key,
        kind: "improvement_focus",
        target_dimension: lowest,
        source: "ai_report",
        content_ref: lowest,
        triggered_by_measurement: `measurements/${measurement_id}`,
      }).catch(() => {});

    } catch (err) {
      console.error("[data-foundation] assessment post-processing failed:", err);
    }
  })();
  // ────────────────────────────────────────────────────────────────────────────

  // If this assessment is linked to a session that has a pending or unsent summary,
  // send it now that we have the AI insights ready.
  if (data.sessionId) {
    try {
      const sessionSnap = await db.collection("sessions").doc(data.sessionId as string).get();
      const session = sessionSnap.data();
      if (
        sessionSnap.exists &&
        !session?.summarySent &&
        (session?.summaryPendingAi || session?.status === "closed")
      ) {
        await dispatchSessionSummary(data.sessionId as string, {
          assessmentId: docRef.id,
          summary: analysis.summary,
          scores: analysis.scores as unknown as Record<string, number>,
          primaryTip: analysis.tips?.[0],
        });
      }
    } catch (err) {
      // Non-fatal — email failure shouldn't break the assessment response
      console.error("[ai-assessment/get] Failed to dispatch pending session summary:", err);
    }
  }

  return NextResponse.json({ ...update });
}
