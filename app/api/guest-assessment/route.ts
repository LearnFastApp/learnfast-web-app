import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { submitTranscription } from "@/lib/assemblyai-client";
import { sendGuestInitiatedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function POST(req: NextRequest) {
  let email: string, downloadUrl: string, fileName: string;
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : "";
    fileName = typeof body.fileName === "string" ? body.fileName : "recording";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!downloadUrl) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  const db = getAdminDb();
  const emailHash = hashEmail(email);

  // One per email, forever
  const rateLimitRef = db.collection("guest_rate_limits").doc(emailHash);
  const rateLimitSnap = await rateLimitRef.get();
  if (rateLimitSnap.exists) {
    return NextResponse.json({ error: "already_used" }, { status: 429 });
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
  });

  // Token index for O(1) lookup by token
  await db.collection("guest_token_index").doc(guestToken).set({
    assessmentId: ref.id,
    createdAt: now,
  });

  // Consume rate limit slot before AssemblyAI so failures still count
  await rateLimitRef.set({ emailHash, createdAt: now });

  // Submit to AssemblyAI
  try {
    const transcriptId = await submitTranscription(downloadUrl);
    await ref.update({ assemblyAiId: transcriptId, status: "processing" });
  } catch (err) {
    console.error("[guest-assessment] AssemblyAI submit failed:", err);
    await ref.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  // Send email with the results link
  const resultsUrl = `${APP_URL}/try/${guestToken}`;
  try {
    await sendGuestInitiatedEmail(email, resultsUrl);
    await ref.update({ guestEmailSent: true });
  } catch (err) {
    console.error("[guest-assessment] Email send failed:", err);
  }

  return NextResponse.json({ success: true });
}
