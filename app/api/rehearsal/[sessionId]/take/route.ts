import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { uploadAndSubmitTranscription } from "@/lib/assemblyai-client";
import { uploadTakeAudio } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();
  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);

  let sessionSnap;
  try {
    sessionSnap = await sessionRef.get();
  } catch (err) {
    // A stale/expired backend credential (or any transient Firestore issue)
    // throws here uncaught, producing a non-JSON 500 that the client's
    // fetch().json() then fails to parse — surfacing as a misleading
    // "network error" even though nothing about the network is at fault.
    console.error("[rehearsal/take] Firestore read failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sessionData = sessionSnap.data()!;
  const currentTakeCount = (sessionData.takeCount as number) ?? 1;
  const takesLimit = sessionData.takesLimit as number | null; // null = unlimited

  if (takesLimit !== null && currentTakeCount >= takesLimit) {
    return NextResponse.json({ error: "takes_limit_reached" }, { status: 403 });
  }

  let fileBuffer: Buffer;
  let fileName: string;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    fileName = file.name || "recording";
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const newTakeNumber = currentTakeCount + 1;
  const now = Timestamp.fromDate(new Date());

  const takeRef = sessionRef.collection("takes").doc();
  try {
    await takeRef.set({
      takeNumber: newTakeNumber,
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
    await sessionRef.update({ takeCount: newTakeNumber });
  } catch (err) {
    console.error("[rehearsal/take] Firestore write failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // R2 upload — best-effort, never blocks transcription
  const mimeType = fileName.endsWith(".webm") ? "audio/webm" : "audio/mpeg";
  let audioUrl: string | null = null;
  let r2Error: string | null = null;
  try {
    audioUrl = await uploadTakeAudio(takeRef.id, fileBuffer, mimeType);
  } catch (err) {
    r2Error = err instanceof Error
      ? (err.message || err.name || "r2_error_no_message")
      : (String(err) || "r2_unknown_error");
    console.error("[rehearsal/take] R2 upload failed:", r2Error);
  }

  let transcriptId: string;
  try {
    transcriptId = await uploadAndSubmitTranscription(fileBuffer);
  } catch (err) {
    console.error("[rehearsal/take] AssemblyAI upload failed:", err);
    await takeRef.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  await takeRef.update({ assemblyAiId: transcriptId, audioUrl, r2Error, status: "processing" });

  return NextResponse.json({
    takeId: takeRef.id,
    takeNumber: newTakeNumber,
    takesRemaining: takesLimit !== null ? takesLimit - newTakeNumber : null,
  });
}
