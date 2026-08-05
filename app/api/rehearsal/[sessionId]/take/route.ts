import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { submitTranscription } from "@/lib/assemblyai-client";
import { uploadTakeAudioFromUrl } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

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

  let downloadUrl: string;
  let storagePath: string | null;
  let fileName: string;
  let contentType: string;

  try {
    const body = await req.json();
    downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl : "";
    if (!downloadUrl) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    storagePath = typeof body.storagePath === "string" ? body.storagePath : null;
    fileName = typeof body.fileName === "string" ? body.fileName : "recording";
    contentType = typeof body.contentType === "string" ? body.contentType : "audio/webm";
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
    await sessionRef.update({ takeCount: newTakeNumber });
  } catch (err) {
    console.error("[rehearsal/take] Firestore write failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // R2 relay — fire-and-forget, never blocks the response. Streams from the
  // Storage download URL rather than buffering in memory (files here can be
  // a multi-hundred-MB video and this instance only has 512MiB).
  uploadTakeAudioFromUrl(takeRef.id, downloadUrl, contentType)
    .then((audioUrl) => takeRef.update({ audioUrl }).catch(() => {}))
    .catch((err) => {
      const r2Error = err instanceof Error ? (err.message || err.name) : String(err);
      console.error("[rehearsal/take] R2 relay failed:", r2Error);
      takeRef.update({ r2Error: r2Error || "r2_unknown_error" }).catch(() => {});
    });

  let transcriptId: string;
  try {
    transcriptId = await submitTranscription(downloadUrl);
  } catch (err) {
    console.error("[rehearsal/take] AssemblyAI submit failed:", err);
    await takeRef.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  await takeRef.update({ assemblyAiId: transcriptId, status: "processing" });

  return NextResponse.json({
    takeId: takeRef.id,
    takeNumber: newTakeNumber,
    takesRemaining: takesLimit !== null ? takesLimit - newTakeNumber : null,
  });
}
