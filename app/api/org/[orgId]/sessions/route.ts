import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";
import { generateUniqueFeedbackCode } from "@/lib/feedback-code";
import { sendSessionConfirmationEmail } from "@/lib/email";
import type { OrgSessionType } from "@/types/enterprise";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.learnfastapp.com";
const VALID_TYPES: OrgSessionType[] = ["presentation", "rehearsal", "meeting"];

type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const snap = await db
    .collection(`organizations/${orgId}/sessions`)
    .orderBy("scheduledStart", "desc")
    .limit(100)
    .get();

  const sessions = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      scheduledStart: data.scheduledStart?.toDate?.()?.toISOString() ?? null,
      scheduledEnd: data.scheduledEnd?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { title, type, scheduledStart, scheduledEnd, timezone } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  if (!scheduledStart || !scheduledEnd) return NextResponse.json({ error: "dates_required" }, { status: 400 });
  if (!timezone?.trim()) return NextResponse.json({ error: "timezone_required" }, { status: 400 });

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "end_before_start" }, { status: 400 });
  }

  const feedbackCode = await generateUniqueFeedbackCode();
  const feedbackUrl = `${BASE_URL}/f/${feedbackCode}`;

  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");
  const db = getAdminDb();

  const sessionRef = db.collection(`organizations/${orgId}/sessions`).doc();
  const sessionData = {
    title: title.trim(),
    type,
    presenterId: uid,
    scheduledStart: Timestamp.fromDate(start),
    scheduledEnd: Timestamp.fromDate(end),
    timezone: timezone.trim(),
    feedbackCode,
    feedbackUrl,
    qrGenerated: false,
    status: "scheduled",
    linkedRecordingId: null,
    calendarEventCreated: false,
    orgId,
    createdAt: FieldValue.serverTimestamp(),
  };

  // Write session doc + feedback code index atomically
  const batch = db.batch();
  batch.set(sessionRef, sessionData);
  batch.set(db.collection("session_feedback_codes").doc(feedbackCode), {
    orgId,
    sessionId: sessionRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  // Send confirmation email (non-blocking — don't fail the request if email fails)
  try {
    const userRecord = await (await import("@/lib/firebase-admin")).getAdminAuth().getUser(uid);
    const presSnap = await db.doc(`presenters/${uid}`).get();
    const displayName = presSnap.data()?.displayName ?? userRecord.displayName ?? "Presenter";
    const orgSnap = await db.doc(`organizations/${orgId}`).get();
    const orgName = orgSnap.data()?.name ?? "Your organisation";
    if (userRecord.email) {
      sendSessionConfirmationEmail({
        to: userRecord.email,
        presenterName: displayName,
        sessionTitle: title.trim(),
        sessionType: type,
        orgName,
        scheduledStart: start,
        scheduledEnd: end,
        timezone: timezone.trim(),
        feedbackCode,
        feedbackUrl,
      }).catch(() => { /* email failure is non-fatal */ });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({
    id: sessionRef.id,
    feedbackCode,
    feedbackUrl,
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
  }, { status: 201 });
}
