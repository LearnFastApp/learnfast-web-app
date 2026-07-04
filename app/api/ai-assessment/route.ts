import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { submitTranscription } from "@/lib/assemblyai-client";
import { getContext, getLocalizedContextLabel } from "@/lib/contexts/registry";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 0;
const LITE_LIMIT = 3;
const ADMIN_UIDS = new Set(["zuFmYCIaGLViRSc7LXFwej6wql22"]);

async function checkGate(uid: string): Promise<{ allowed: boolean; reason?: string }> {
  if (ADMIN_UIDS.has(uid)) return { allowed: true };
  const db = getAdminDb();
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return { allowed: false, reason: "no_presenter" };

  const data = presenterSnap.data()!;
  const status = data.subscriptionStatus as string;
  const pilotExpiry = data.pilotExpiresAt?.toDate?.() as Date | undefined;
  const isPilot = status === "pilot" && pilotExpiry && pilotExpiry > new Date();

  // Org members are treated as Lite regardless of their consumer subscription status
  const isOrgMember = !!(data.orgId as string | undefined);
  const isPaid = status === "active" || status === "lite" || isOrgMember || isPilot;

  if (!isPaid) return { allowed: false, reason: "upgrade_required" };

  // Pro (future): unlimited — for now all paid = Lite limit
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Single-field query (no composite index needed); filter dates in memory
  const docsSnap = await db.collection("ai_assessments")
    .where("presenterId", "==", uid)
    .get();

  const used = docsSnap.docs.filter((d) => {
    const createdAt = d.data().createdAt?.toDate?.() as Date | undefined;
    return createdAt && createdAt >= startOfMonth;
  }).length;
  const limit = LITE_LIMIT; // TODO: Pro = unlimited when Pro tier launches
  if (used >= limit) return { allowed: false, reason: "monthly_limit" };

  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await checkGate(uid);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : null;
  const fileName = typeof body.fileName === "string" ? body.fileName : "recording";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  const rawContextId = typeof body.contextId === "string" ? body.contextId : "general";
  const resolvedContext = getContext(rawContextId);

  if (!downloadUrl) return NextResponse.json({ error: "Missing downloadUrl" }, { status: 400 });

  const db = getAdminDb();

  // Read presenter profile for industry and locale
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const industry = (presenterSnap.data()?.industry as string | undefined) ?? null;
  const userLocale = (presenterSnap.data()?.locale as string | undefined) ?? "en";

  // Create the assessment doc
  const ref = db.collection("ai_assessments").doc();
  const now = new Date();
  await ref.set({
    presenterId: uid,
    sessionId,
    industry,
    createdAt: now,
    fileName,
    storagePath,
    status: "queued",
    assemblyAiId: null,
    scores: null,
    analysis: null,
    contextId: resolvedContext.contextId,
    contextLabelAtTime: getLocalizedContextLabel(resolvedContext.contextId, userLocale),
    contextPromptVersion: resolvedContext.promptVersion,
    userLocale,
  });

  // Link assessment back to the session doc so the session page can find it by direct read
  if (sessionId) {
    await db.collection("sessions").doc(sessionId).update({ aiAssessmentId: ref.id }).catch(() => {});
  }

  // Submit to AssemblyAI (non-blocking — returns transcript ID immediately)
  try {
    const transcriptId = await submitTranscription(downloadUrl);
    await ref.update({ assemblyAiId: transcriptId, status: "processing" });
  } catch (err) {
    console.error("[ai-assessment] AssemblyAI submit failed:", err);
    await ref.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "Transcription submission failed" }, { status: 500 });
  }

  return NextResponse.json({ assessmentId: ref.id });
}
