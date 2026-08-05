import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getTranscription, countFillerWords } from "@/lib/assemblyai-client";
import { coachRehearsalTake } from "@/lib/rehearsal-coaching";
import type { AssessmentScores } from "@/lib/ai-assessment-analysis";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";
import { writeMeasurement } from "@/lib/measurement-writer";
import { uploadRawRehearsalBundle } from "@/lib/r2-client";
import { completePrescribedSession } from "@/lib/gameday/complete-prescribed-session";
import { generateAndSaveCueCard, shouldGenerateCueCard, compositeScore } from "@/lib/gameday/generate-cue-card";
import { refundRehearsalQuotaIfFirstTake } from "@/lib/rehearsal-gate";

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
  const sessionData = sessionSnap.data()!;
  const sessionTier = (sessionData.tier as string | undefined) ?? "free";
  const sessionCreatedAt: Date = sessionData.createdAt?.toDate?.() ?? new Date();

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
    await refundRehearsalQuotaIfFirstTake(db, uid, sessionTier, takeData.takeNumber as number, sessionCreatedAt);
    return NextResponse.json({ status: "failed", error: transcript.error, takeId });
  }

  if (transcript.status !== "completed") {
    return NextResponse.json({ status: "processing", takeId });
  }

  const audioDurationSeconds = transcript.audio_duration ?? 0;
  const maxDuration = DURATION_LIMITS[sessionTier] ?? 300;
  if (audioDurationSeconds > maxDuration) {
    await takeRef.update({ status: "failed", error: "duration_exceeded" });
    await refundRehearsalQuotaIfFirstTake(db, uid, sessionTier, takeData.takeNumber as number, sessionCreatedAt);
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
  const fillerWordCount = countFillerWords(words, transcript.language_code ?? undefined);

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

  const sessionContextId = (sessionData.contextId as string | undefined) ?? "general";
  const sessionUserLocale = (sessionData.userLocale as string | undefined) ?? "en";

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
      userLocale: sessionUserLocale,
      sessionType: sessionData.gamedaySessionType as string | undefined,
    });
  } catch (err) {
    console.error("[rehearsal/takeId] Coaching failed:", err);
    await takeRef.update({ status: "failed", error: "coaching_failed" });
    await refundRehearsalQuotaIfFirstTake(db, uid, sessionTier, takeNumber, sessionCreatedAt);
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
    readyForScript: coaching.readyForScript ?? null,
    suggestedOutline: coaching.suggestedOutline ?? null,
  };

  try {
    await takeRef.update(update);
  } catch (err) {
    // The take was already claimed (status: "analyzing") by the transaction
    // above — if this write fails, it must still reach a terminal state, or
    // it's stuck forever (every future poll sees a non-"processing" status
    // and just returns {status:"processing"} without ever retrying).
    console.error("[rehearsal/takeId] Final take update failed:", err);
    await takeRef.update({ status: "failed", error: "save_failed" }).catch(() => {});
    await refundRehearsalQuotaIfFirstTake(db, uid, sessionTier, takeNumber, sessionCreatedAt);
    return NextResponse.json({ status: "failed", error: "save_failed", takeId });
  }

  // ── Data Foundation: measurement record + event (fire-and-forget) ────────────
  (async () => {
    try {
      const user_key = await getOrCreateUserKey(uid);
      const orgId = (sessionData.orgId as string | undefined) ?? null;

      // Raw artifact bundle
      let raw_ref: string | null = null;
      try {
        const bundle_id = `${takeId}-${Date.now()}`;
        raw_ref = await uploadRawRehearsalBundle(user_key, bundle_id, {
          transcript_text: transcript.text ?? "",
          assemblyai_response: transcript as unknown as Record<string, unknown>,
          coaching_response: coaching as unknown as Record<string, unknown>,
        });
      } catch (storageErr) {
        console.error("[data-foundation] rehearsal raw bundle upload failed:", storageErr);
      }

      const measurement_id = await writeMeasurement({
        user_key,
        org_id: orgId,
        kind: "rehearsal_take",
        context: {
          assessment_type: (sessionData.contextId as string | undefined) ?? "general",
          duration_seconds: audioDurationSeconds,
          locale: languageCode,
          take_number: takeNumber,
        },
        scores: coaching.scores as { clarity: number; energy: number; engagement: number; understanding: number; connection: number },
        signal: "ai",
        raw_ref,
      });
      logEvent("measurement.rehearsal_take_completed", {
        user_key,
        org_id: orgId,
        payload: {
          measurement_id,
          session_id: sessionId,
          take_id: takeId,
          take_number: takeNumber,
          duration_seconds: audioDurationSeconds,
          scores: coaching.scores,
        },
      });

      const prescribedSessionId = sessionData.prescribedSessionId as string | undefined;
      const planId = sessionData.planId as string | undefined;
      if (prescribedSessionId) {
        await completePrescribedSession({ prescribedSessionId, rehearsalSessionId: sessionId, takeId, userId: uid });
        logEvent("gameday.prescribed_session_completed", {
          user_key,
          org_id: orgId,
          payload: {
            prescribedSessionId,
            planId: planId ?? null,
            sessionType: sessionData.gamedaySessionType ?? null,
            wasFreeAttribution: false,
          },
        });
      }

      // Cue card: extracted after the HIGHEST-scoring fullrun (spec §2) — one
      // isolated Anthropic call, never blocking the main response.
      if (planId && sessionData.gamedaySessionType === "fullrun") {
        const thisComposite = compositeScore(
          coaching.scores as { clarity: number; energy: number; engagement: number; understanding: number; connection: number }
        );
        if (await shouldGenerateCueCard({ planId, thisComposite })) {
          await generateAndSaveCueCard({
            planId,
            userId: uid,
            rehearsalSessionId: sessionId,
            takeId,
            transcriptText: transcript.text ?? "",
            locale: sessionUserLocale,
            user_key,
          });
        }
      }
    } catch (err) {
      console.error("[data-foundation] rehearsal take post-processing failed:", err);
    }
  })();
  // ─────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ...update, takeId });
}
