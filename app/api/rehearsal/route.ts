import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { uploadAndSubmitTranscription } from "@/lib/assemblyai-client";
import { uploadTakeAudio } from "@/lib/r2-client";
import { getContext, getLocalizedContextLabel } from "@/lib/contexts/registry";
import { monthKey, refundRehearsalQuotaIfFirstTake } from "@/lib/rehearsal-gate";

export const dynamic = "force-dynamic";

const FREE_SESSION_LIMIT = 1;
const FREE_TAKES_LIMIT = 3;
const LITE_MONTHLY_LIMIT = 3;
const LITE_TAKES_LIMIT = 5;
const ADMIN_UIDS = new Set(["zuFmYCIaGLViRSc7LXFwej6wql22"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

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
  let fileBuffer: Buffer;
  let fileName: string;
  let contextId: string;
  let contextLabelAtTime: string;
  let contextPromptVersion: string;
  let planId: string | null;
  let prescribedSessionId: string | null;
  let gamedaySessionType: string | null;

  try {
    const formData = await req.formData();
    title = ((formData.get("title") as string) ?? "").trim();
    const rawTags = (formData.get("tags") as string) ?? "[]";
    tags = JSON.parse(rawTags) as string[];
    const rawContextId = ((formData.get("contextId") as string) ?? "general").trim() || "general";
    const resolvedContext = getContext(rawContextId);
    contextId = resolvedContext.contextId;
    contextLabelAtTime = resolvedContext.label;
    contextPromptVersion = resolvedContext.promptVersion;
    // Gameday preload — all optional, absent for every non-Gameday session creation.
    planId = ((formData.get("planId") as string) ?? "").trim() || null;
    prescribedSessionId = ((formData.get("prescribedSessionId") as string) ?? "").trim() || null;
    gamedaySessionType = ((formData.get("sessionType") as string) ?? "").trim() || null;
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    fileName = file.name || "recording";
    fileBuffer = Buffer.from(await file.arrayBuffer());
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

  const mimeType = fileName.endsWith(".webm") ? "audio/webm" : "audio/mpeg";

  const takeRef = sessionRef.collection("takes").doc();
  await takeRef.set({
    takeNumber: 1,
    fileName,
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

  // R2 upload — best-effort, never blocks transcription
  let audioUrl: string | null = null;
  let r2Error: string | null = null;
  try {
    audioUrl = await uploadTakeAudio(takeRef.id, fileBuffer, mimeType);
  } catch (err) {
    r2Error = err instanceof Error
      ? (err.message || err.name || "r2_error_no_message")
      : (String(err) || "r2_unknown_error");
    console.error("[rehearsal] R2 upload failed:", r2Error);
  }

  let transcriptId: string;
  try {
    transcriptId = await uploadAndSubmitTranscription(fileBuffer);
  } catch (err) {
    console.error("[rehearsal] AssemblyAI upload failed:", err);
    await takeRef.update({ status: "failed", error: String(err) });
    await refundRehearsalQuotaIfFirstTake(db, uid, gate.tier, 1, now.toDate());
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  await takeRef.update({ assemblyAiId: transcriptId, audioUrl, r2Error, status: "processing" });

  return NextResponse.json({
    sessionId: sessionRef.id,
    takeId: takeRef.id,
    takeNumber: 1,
    takesLimit,
  });
}
