import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";
import { generateUniqueFeedbackCode } from "@/lib/feedback-code";
import { sendSessionConfirmationEmail } from "@/lib/email";
import type { OrgSessionType } from "@/types/enterprise";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.learnfastapp.com";
const VALID_TYPES: OrgSessionType[] = ["presentation", "rehearsal", "meeting"];

// Consumer session code: same charset as feedback-code.ts but generated inline
// to avoid an extra round-trip — collision checked against `sessions` collection.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function generateConsumerCode(db: FirebaseFirestore.Firestore): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    const existing = await db.collection("sessions").where("code", "==", code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error("Failed to generate unique consumer session code");
}

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

  // Sync: for any "live" org session whose consumer session has since closed,
  // auto-complete it so the UI stays accurate without manual intervention.
  const liveDocs = snap.docs.filter(
    (d) => d.data().status === "live" && d.data().linkedConsumerSessionId,
  );
  if (liveDocs.length > 0) {
    const { FieldValue } = await import("firebase-admin/firestore");
    await Promise.all(
      liveDocs.map(async (d) => {
        const consumerSnap = await db.doc(`sessions/${d.data().linkedConsumerSessionId}`).get();
        if (consumerSnap.data()?.status === "closed") {
          await d.ref.update({ status: "completed", updatedAt: FieldValue.serverTimestamp() });
        }
      }),
    );
    // Re-fetch after potential updates
    const refreshed = await db
      .collection(`organizations/${orgId}/sessions`)
      .orderBy("scheduledStart", "desc")
      .limit(100)
      .get();
    const sessions = refreshed.docs.map((d) => {
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

  const { title, type, scheduledStart, scheduledEnd, timezone, copresenterUids, startNow } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });

  let start: Date;
  let end: Date;

  if (startNow) {
    start = new Date();
    end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour
  } else {
    if (!scheduledStart || !scheduledEnd) return NextResponse.json({ error: "dates_required" }, { status: 400 });
    if (!timezone?.trim()) return NextResponse.json({ error: "timezone_required" }, { status: 400 });
    start = new Date(scheduledStart);
    end = new Date(scheduledEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: "end_before_start" }, { status: 400 });
    }
  }

  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");
  const db = getAdminDb();

  // Resolve co-presenter UIDs → { uid, displayName }
  type CoPres = { uid: string; displayName: string };
  let copresenters: CoPres[] = [];
  let copresenterIds: string[] = [];

  if (Array.isArray(copresenterUids) && copresenterUids.length > 0) {
    // Deduplicate and exclude the lead presenter
    const uniqueUids = [...new Set(copresenterUids as string[])].filter((u) => u !== uid);
    if (uniqueUids.length > 0) {
      // Validate each is an active org member and get display name
      const memberSnaps = await Promise.all(
        uniqueUids.map((u) => db.doc(`organizations/${orgId}/members/${u}`).get()),
      );
      const presenterSnaps = await Promise.all(
        uniqueUids.map((u) => db.doc(`presenters/${u}`).get()),
      );
      for (let i = 0; i < uniqueUids.length; i++) {
        const memberDoc = memberSnaps[i];
        if (!memberDoc.exists || memberDoc.data()?.status !== "active") continue;
        const displayName =
          presenterSnaps[i].data()?.displayName ??
          memberDoc.data()?.displayName ??
          memberDoc.data()?.email ??
          uniqueUids[i];
        copresenters.push({ uid: uniqueUids[i], displayName });
        copresenterIds.push(uniqueUids[i]);
      }
    }
  }

  // Generate both codes
  const [feedbackCode, consumerCode] = await Promise.all([
    generateUniqueFeedbackCode(),
    generateConsumerCode(db),
  ]);

  // feedbackUrl points to /f/{code} which does window check then redirects to /session/{consumerCode}
  const feedbackUrl = `${BASE_URL}/f/${feedbackCode}`;

  const orgSessionRef = db.collection(`organizations/${orgId}/sessions`).doc();
  const consumerSessionRef = db.collection("sessions").doc();

  const batch = db.batch();

  // Consumer session — enterprise org members bypass free-tier session limit
  batch.set(consumerSessionRef, {
    presenterId: uid,
    title: title.trim(),
    code: consumerCode,
    tags: [],
    status: "active",
    orgSessionId: orgSessionRef.id,
    orgId,
    scheduledStart: Timestamp.fromDate(start),
    scheduledEnd: Timestamp.fromDate(end),
    copresenters,
    copresenterIds,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: null,
    summarySent: false,
  });

  // Org session
  batch.set(orgSessionRef, {
    title: title.trim(),
    type,
    presenterId: uid,
    scheduledStart: Timestamp.fromDate(start),
    scheduledEnd: Timestamp.fromDate(end),
    timezone: startNow ? "UTC" : timezone.trim(),
    feedbackCode,
    feedbackUrl,
    linkedConsumerSessionId: consumerSessionRef.id,
    linkedConsumerCode: consumerCode,
    copresenters,
    copresenterIds,
    qrGenerated: false,
    status: startNow ? "live" : "scheduled",
    ...(startNow ? { liveAt: FieldValue.serverTimestamp() } : {}),
    linkedRecordingId: null,
    calendarEventCreated: false,
    orgId,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Feedback code index for /f/{code} lookup
  batch.set(db.collection("session_feedback_codes").doc(feedbackCode), {
    orgId,
    sessionId: orgSessionRef.id,
    consumerSessionId: consumerSessionRef.id,
    consumerCode,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Confirmation email — skip for instant-start sessions (already live)
  if (!startNow) {
    try {
      const { getAdminAuth } = await import("@/lib/firebase-admin");
      const userRecord = await getAdminAuth().getUser(uid);
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
        }).catch(() => {});
      }
    } catch {}
  }

  return NextResponse.json({
    id: orgSessionRef.id,
    feedbackCode,
    feedbackUrl,
    linkedConsumerSessionId: consumerSessionRef.id,
    linkedConsumerCode: consumerCode,
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    live: !!startNow,
  }, { status: 201 });
}
