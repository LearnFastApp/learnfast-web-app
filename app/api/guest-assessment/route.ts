import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { uploadAndSubmitTranscription } from "@/lib/assemblyai-client";
import { getContext } from "@/lib/contexts/registry";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — well above any 90s audio

// Emails that bypass the one-per-email rate limit (admin / testing)
const RATE_LIMIT_BYPASS = new Set(["physicalperformance@icloud.com"]);

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function POST(req: NextRequest) {
  let email: string;
  let fileBuffer: Buffer;
  let fileName: string;

  let contextId: string;
  let contextLabelAtTime: string;
  let contextPromptVersion: string;

  try {
    const formData = await req.formData();
    email = ((formData.get("email") as string) ?? "").toLowerCase().trim();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    fileName = file.name || "recording";
    fileBuffer = Buffer.from(await file.arrayBuffer());
    const rawContextId = ((formData.get("contextId") as string) ?? "general").trim() || "general";
    const resolvedContext = getContext(rawContextId);
    contextId = resolvedContext.contextId;
    contextLabelAtTime = resolvedContext.label;
    contextPromptVersion = resolvedContext.promptVersion;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const db = getAdminDb();
  const emailHash = hashEmail(email);
  const isAdmin = RATE_LIMIT_BYPASS.has(email);

  if (!isAdmin) {
    // One per email, forever
    const rateLimitSnap = await db.collection("guest_rate_limits").doc(emailHash).get();
    if (rateLimitSnap.exists) {
      return NextResponse.json({ error: "already_used" }, { status: 429 });
    }
  }

  const guestToken = crypto.randomUUID();
  const now = Timestamp.fromDate(new Date());

  // Create assessment doc
  const ref = db.collection("ai_assessments").doc();
  await ref.set({
    isGuest: true,
    guestEmail: email,
    guestToken,
    presenterId: null,
    claimedByUid: null,
    sessionId: null,
    emailSequenceDay: 0,
    guestEmailSent: false,
    createdAt: now,
    fileName,
    status: "queued",
    assemblyAiId: null,
    scores: null,
    contextId,
    contextLabelAtTime,
    contextPromptVersion,
  });

  // Token index for O(1) lookup
  await db.collection("guest_token_index").doc(guestToken).set({
    assessmentId: ref.id,
    createdAt: now,
  });

  // Consume rate limit slot before AssemblyAI so failures still use the quota (skip for admins)
  if (!isAdmin) {
    await db.collection("guest_rate_limits").doc(emailHash).set({ emailHash, createdAt: now });
  }

  // Upload buffer directly to AssemblyAI and submit (no Firebase Storage needed)
  try {
    const transcriptId = await uploadAndSubmitTranscription(fileBuffer, { audioEndAt: 90 * 1000 });
    await ref.update({ assemblyAiId: transcriptId, status: "processing" });
  } catch (err) {
    console.error("[guest-assessment] AssemblyAI upload/submit failed:", err);
    await ref.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  // Return the token so the client can redirect straight to the results page
  return NextResponse.json({ success: true, token: guestToken });
}
