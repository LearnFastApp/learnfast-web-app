import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { uploadAndSubmitTranscription } from "@/lib/assemblyai-client";

export const dynamic = "force-dynamic";

const FREE_SESSION_LIMIT = 1;
const FREE_TAKES_LIMIT = 3;
const LITE_MONTHLY_LIMIT = 3;
const LITE_TAKES_LIMIT = 5;
const ADMIN_UIDS = new Set(["zuFmYCIaGLViRSc7LXFwej6wql22"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

type Tier = "admin" | "pro" | "lite" | "free";

async function checkGate(uid: string): Promise<{ allowed: boolean; reason?: string; tier: Tier }> {
  if (ADMIN_UIDS.has(uid)) return { allowed: true, tier: "admin" };

  const db = getAdminDb();
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return { allowed: false, reason: "no_presenter", tier: "free" };

  const data = presenterSnap.data()!;
  const status = data.subscriptionStatus as string;
  const pilotExpiry = data.pilotExpiresAt?.toDate?.() as Date | undefined;
  const isPilot = status === "pilot" && pilotExpiry && pilotExpiry > new Date();
  const isPro = status === "pro";
  if (isPro || isPilot) return { allowed: true, tier: "pro" };

  if (status === "active") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const snap = await db.collection("rehearsal_sessions")
      .where("presenterId", "==", uid)
      .get();
    const usedThisMonth = snap.docs.filter((d) => {
      const createdAt = d.data().createdAt?.toDate?.() as Date | undefined;
      return createdAt && createdAt >= startOfMonth;
    }).length;
    if (usedThisMonth >= LITE_MONTHLY_LIMIT) {
      return { allowed: false, reason: "monthly_limit", tier: "lite" };
    }
    return { allowed: true, tier: "lite" };
  }

  // Free tier — 1 rehearsal session ever as a taster
  const freeSnap = await db.collection("rehearsal_sessions")
    .where("presenterId", "==", uid)
    .limit(FREE_SESSION_LIMIT + 1)
    .get();
  if (freeSnap.size >= FREE_SESSION_LIMIT) {
    return { allowed: false, reason: "free_limit", tier: "free" };
  }
  return { allowed: true, tier: "free" };
}

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("rehearsal_sessions")
    .where("presenterId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  try {
    const formData = await req.formData();
    title = ((formData.get("title") as string) ?? "").trim();
    const rawTags = (formData.get("tags") as string) ?? "[]";
    tags = JSON.parse(rawTags) as string[];
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
    promotedTakeId: null,
    promotedAssessmentId: null,
  });

  const takeRef = sessionRef.collection("takes").doc();
  await takeRef.set({
    takeNumber: 1,
    fileName,
    assemblyAiId: null,
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

  try {
    const transcriptId = await uploadAndSubmitTranscription(fileBuffer);
    await takeRef.update({ assemblyAiId: transcriptId, status: "processing" });
  } catch (err) {
    console.error("[rehearsal] AssemblyAI upload failed:", err);
    await takeRef.update({ status: "failed", error: String(err) });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: sessionRef.id,
    takeId: takeRef.id,
    takeNumber: 1,
    takesLimit,
  });
}
