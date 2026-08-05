import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { submitTranscription } from "@/lib/assemblyai-client";
import { uploadTakeAudioFromUrl } from "@/lib/r2-client";
import { getContext, getLocalizedContextLabel } from "@/lib/contexts/registry";
import { monthKey, refundRehearsalQuotaIfFirstTake } from "@/lib/rehearsal-gate";

export const dynamic = "force-dynamic";

const FREE_SESSION_LIMIT = 1;
const FREE_TAKES_LIMIT = 3;
const LITE_MONTHLY_LIMIT = 3;
const LITE_TAKES_LIMIT = 5;
const ADMIN_UIDS = new Set(["zuFmYCIaGLViRSc7LXFwej6wql22"]);

type Tier = "admin" | "pro" | "lite" | "free";

async function checkGate(uid: string): Promise<{ allowed: boolean; reason?: string; tier: Tier; orgId?: string }> {
  if (ADMIN_UIDS.has(uid)) return { allowed: true, tier: "admin" };

  const db = getAdminDb();
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return { allowed: false, reason: "no_presenter", tier: "free" };

  const data = presenterSnap.data()!;

  // Active enterprise org members get unlimited rehearsals regardless of consumer tier
  const orgId = data.orgId as string | undefined;
  if (orgId) {
    const memberSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get();
    if (memberSnap.exists && memberSnap.data()?.status === "active") {
      return { allowed: true, tier: "pro", orgId };
    }
  }

  const status = data.subscriptionStatus as string;
  const pilotExpiry = data.pilotExpiresAt?.toDate?.() as Date | undefined;
  const isPilot = status === "pilot" && pilotExpiry && pilotExpiry > new Date();
  const isPro = status === "pro";
  if (isPro || isPilot) return { allowed: true, tier: "pro" };

  if (status === "active") {
    // Use a persisted monthly counter so deleting sessions can't reset usage
    const usedThisMonth = (data.rehearsalMonthlyUsage?.[monthKey()] as number) ?? 0;
    if (usedThisMonth >= LITE_MONTHLY_LIMIT) {
      return { allowed: false, reason: "monthly_limit", tier: "lite" };
    }
    return { allowed: true, tier: "lite" };
  }

  // Free tier — 1 rehearsal ever as a taster; use a persistent flag so
  // deleting the session cannot reset the entitlement
  if (data.freeRehearsalUsed === true) {
    return { allowed: false, reason: "free_limit", tier: "free" };
  }
  return { allowed: true, tier: "free" };
}

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  const db = getAdminDb();
  let query = db
    .collection("rehearsal_sessions")
    .where("presenterId", "==", uid) as FirebaseFirestore.Query;

  if (orgId) {
    query = query.where("orgId", "==", orgId);
  }

  const snap = await query.orderBy("createdAt", "desc").limit(20).get();

  const sessions = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gate = await checkGate(uid);
  if (!gate.allowed) return NextResponse.json({ error: gate.reason }, { status: 403 });

  let title: string;
  let tags: string[];
  let downloadUrl: string;
  let storagePath: string | null;
  let fileName: string;
  let contentType: string;
  let contextId: string;
  let contextLabelAtTime: string;
  let contextPromptVersion: string;
  let planId: string | null;
  let prescribedSessionId: string | null;
  let gamedaySessionType: string | null;

  try {
    const body = await req.json();
    title = (typeof body.title === "string" ? body.title : "").trim();
    tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
    const rawContextId = (typeof body.contextId === "string" ? body.contextId : "general").trim() || "general";
    const resolvedContext = getContext(rawContextId);
    contextId = resolvedContext.contextId;
    contextLabelAtTime = resolvedContext.label;
    contextPromptVersion = resolvedContext.promptVersion;
    // Gameday preload — all optional, absent for every non-Gameday session creation.
    planId = typeof body.planId === "string" ? body.planId : null;
    prescribedSessionId = typeof body.prescribedSessionId === "string" ? body.prescribedSessionId : null;
    gamedaySessionType = typeof body.sessionType === "string" ? body.sessionType : null;

    downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : "";
    if (!downloadUrl) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    storagePath = typeof body.storagePath === "string" ? body.storagePath : null;
    fileName = typeof body.fileName === "string" ? body.fileName : "recording";
    contentType = typeof body.contentType === "string" ? body.contentType : "audio/webm";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();
  const now = Timestamp.fromDate(new Date());

  const takesLimit = gate.tier === "free" ? FREE_TAKES_LIMIT
    : gate.tier === "lite" ? LITE_TAKES_LIMIT
    : null; // null = unlimited

  // Read user locale for AI pipeline cultural adaptation
  const presenterRef = db.collection("presenters").doc(uid);
  const presenterSnap2 = await presenterRef.get();
  const userLocale = (presenterSnap2.data()?.locale as string | undefined) ?? "en";

  // Persist usage so that deleting a session cannot reset the entitlement
  if (gate.tier === "free") {
    await presenterRef.update({ freeRehearsalUsed: true });
  } else if (gate.tier === "lite") {
    const key = `rehearsalMonthlyUsage.${monthKey()}`;
    const { FieldValue } = await import("firebase-admin/firestore");
    await presenterRef.update({ [key]: FieldValue.increment(1) });
  }

  const sessionRef = db.collection("rehearsal_sessions").doc();
  await sessionRef.set({
    presenterId: uid,
    title,
    tags,
    createdAt: now,
    status: "active",
    takeCount: 1,
    takesLimit,
    tier: gate.tier,
    orgId: gate.orgId ?? null,
    promotedTakeId: null,
    promotedAssessmentId: null,
    contextId,
    contextLabelAtTime: getLocalizedContextLabel(contextId, userLocale),
    contextPromptVersion,
    userLocale,
    planId,
    prescribedSessionId,
    gamedaySessionType,
  });

  const takeRef = sessionRef.collection("takes").doc();
  await takeRef.set({
    takeNumber: 1,
    fileName,
    storagePath,
    assemblyAiId: null,
    audioUrl: null,
    status: "queued",
    scores: null,
    comparison: null,
    strength: null,
    coaching: null,
    nextFocus: null,
    encouragement: null,
    audioDurationSeconds: null,
    wordCount: null,
    fillerWordCount: null,
    wordsPerMinute: null,
    languageCode: null,
    createdAt: now,
    isPromoted: false,
  });

  // R2 relay — fire-and-forget, never blocks the response. Streams from the
  // Storage download URL rather than buffering in memory (files here can be
  // a multi-hundred-MB video and this instance only has 512MiB).
  uploadTakeAudioFromUrl(takeRef.id, downloadUrl, contentType)
    .then((audioUrl) => takeRef.update({ audioUrl }).catch(() => {}))
    .catch((err) => {
      const r2Error = err instanceof Error ? (err.message || err.name) : String(err);
      console.error("[rehearsal] R2 relay failed:", r2Error);
      takeRef.update({ r2Error: r2Error || "r2_unknown_error" }).catch(() => {});
    });

  let transcriptId: string;
  try {
    transcriptId = await submitTranscription(downloadUrl);
  } catch (err) {
    console.error("[rehearsal] AssemblyAI submit failed:", err);
    await takeRef.update({ status: "failed", error: String(err) });
    await refundRehearsalQuotaIfFirstTake(db, uid, gate.tier, 1, now.toDate());
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  await takeRef.update({ assemblyAiId: transcriptId, status: "processing" });

  return NextResponse.json({
    sessionId: sessionRef.id,
    takeId: takeRef.id,
    takeNumber: 1,
    takesLimit,
  });
}
