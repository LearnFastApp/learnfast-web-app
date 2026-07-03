import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

// Window: 15 min before scheduledStart → 60 min after scheduledEnd (or status === 'live')
function isInFeedbackWindow(
  status: string,
  scheduledStart: FirebaseFirestore.Timestamp,
  scheduledEnd: FirebaseFirestore.Timestamp,
): boolean {
  if (status === "live") return true;
  if (status === "completed" || status === "cancelled") return false;
  const now = Date.now();
  const start = scheduledStart.toMillis() - 15 * 60 * 1000;
  const end = scheduledEnd.toMillis() + 60 * 60 * 1000;
  return now >= start && now <= end;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const db = getAdminDb();
  const codeDoc = await db.collection("session_feedback_codes").doc(code.toUpperCase()).get();
  if (!codeDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { orgId, sessionId } = codeDoc.data() as { orgId: string; sessionId: string };
  const [sessionDoc, orgDoc] = await Promise.all([
    db.doc(`organizations/${orgId}/sessions/${sessionId}`).get(),
    db.doc(`organizations/${orgId}`).get(),
  ]);

  if (!sessionDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = sessionDoc.data()!;
  const org = orgDoc.data();
  const inWindow = isInFeedbackWindow(session.status, session.scheduledStart, session.scheduledEnd);

  return NextResponse.json({
    sessionId,
    orgId,
    title: session.title,
    type: session.type,
    orgName: org?.name ?? null,
    status: session.status,
    inWindow,
    feedbackAnonymousDefault: org?.settings?.feedbackAnonymousDefault ?? true,
    scheduledStart: session.scheduledStart?.toDate?.()?.toISOString() ?? null,
    scheduledEnd: session.scheduledEnd?.toDate?.()?.toISOString() ?? null,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;

  // Rate limit: 5 submissions per IP per 10 min
  const ip = getIp(req);
  const { allowed } = rateLimit(`f-feedback:${ip}`, 5, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const db = getAdminDb();
  const codeDoc = await db.collection("session_feedback_codes").doc(code.toUpperCase()).get();
  if (!codeDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { orgId, sessionId } = codeDoc.data() as { orgId: string; sessionId: string };
  const sessionDoc = await db.doc(`organizations/${orgId}/sessions/${sessionId}`).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = sessionDoc.data()!;
  if (!isInFeedbackWindow(session.status, session.scheduledStart, session.scheduledEnd)) {
    return NextResponse.json({ error: "outside_window" }, { status: 410 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { scores, comment, respondentName } = body as {
    scores: { clarity: number; energy: number; engagement: number; understanding: number; connection: number };
    comment?: string;
    respondentName?: string;
  };

  const dims = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
  for (const dim of dims) {
    const v = scores?.[dim];
    if (typeof v !== "number" || v < 1 || v > 10) {
      return NextResponse.json({ error: `invalid_score_${dim}` }, { status: 400 });
    }
  }

  // Fingerprint for duplicate throttling (hashed IP+UA, not for identification)
  const ua = req.headers.get("user-agent") ?? "";
  const raw = `${ip}|${ua}|${sessionId}`;
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const fingerprint = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  await db.collection("feedbackResponses").add({
    orgId,
    sessionId,
    scores: {
      clarity: scores.clarity,
      energy: scores.energy,
      engagement: scores.engagement,
      understanding: scores.understanding,
      connection: scores.connection,
    },
    comment: comment?.trim() || null,
    respondentName: respondentName?.trim() || null,
    fingerprint,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
