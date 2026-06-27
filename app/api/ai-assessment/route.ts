import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { submitTranscription } from "@/lib/assemblyai-client";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 0;
const LITE_LIMIT = 3;

async function checkGate(uid: string): Promise<{ allowed: boolean; reason?: string }> {
  const db = getAdminDb();
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return { allowed: false, reason: "no_presenter" };

  const data = presenterSnap.data()!;
  const status = data.subscriptionStatus as string;
  const pilotExpiry = data.pilotExpiresAt?.toDate?.() as Date | undefined;
  const isPilot = status === "pilot" && pilotExpiry && pilotExpiry > new Date();
  const isPaid = status === "active" || isPilot;

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

  if (!downloadUrl) return NextResponse.json({ error: "Missing downloadUrl" }, { status: 400 });

  const db = getAdminDb();

  // Create the assessment doc
  const ref = db.collection("ai_assessments").doc();
  const now = new Date();
  await ref.set({
    presenterId: uid,
    createdAt: Timestamp.fromDate(now),
    fileName,
    storagePath,
    status: "queued",
    assemblyAiId: null,
    scores: null,
    analysis: null,
  });

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
