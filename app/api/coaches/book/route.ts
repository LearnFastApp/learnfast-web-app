import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { createHash, randomBytes } from "crypto";
import { getAdminDb, verifyAuthToken, getAdminAuth } from "@/lib/firebase-admin";
import { sendCoachNewRequestEmail, sendCoachRequestAckEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://learnfastapp.com";

// POST /api/coaches/book
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as {
    coachSlug?: string;
    slots?: { start: string; end: string }[];
    userNote?: string;
    orgId?: string | null;
  };

  const { coachSlug, slots, userNote = "", orgId = null } = body;

  if (!coachSlug || !slots || slots.length < 1 || slots.length > 3) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();

  // Load coach from public collection
  const coachSnap = await db
    .collection("coachesPublic")
    .where("slug", "==", coachSlug)
    .where("status", "==", "live")
    .limit(1)
    .get();
  if (coachSnap.empty) return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  const coachDoc = coachSnap.docs[0];
  const coachPublic = coachDoc.data();

  // Load private coach fields (email, meetingUrl)
  const privateSnap = await db.collection("coaches").doc(coachDoc.id).get();
  if (!privateSnap.exists) return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  const coachPrivate = privateSnap.data()!;

  // Rate limit: max 3 open requests per user
  const userOpenCalls = await db
    .collection("discoveryCalls")
    .where("userId", "==", uid)
    .where("status", "==", "requested")
    .get();
  if (userOpenCalls.size >= 3) {
    return NextResponse.json({ error: "too_many_open_requests" }, { status: 429 });
  }

  // Rate limit: max 1 open request per coach from this user
  const existingForCoach = await db
    .collection("discoveryCalls")
    .where("userId", "==", uid)
    .where("coachId", "==", coachDoc.id)
    .where("status", "==", "requested")
    .limit(1)
    .get();
  if (!existingForCoach.empty) {
    return NextResponse.json({ error: "already_requested_this_coach" }, { status: 409 });
  }

  // Get user details
  const userRecord = await getAdminAuth().getUser(uid);
  const userName = userRecord.displayName ?? userRecord.email?.split("@")[0] ?? "A user";
  const userEmail = userRecord.email ?? "";

  // Generate action token
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const icsUid = `lf-${Date.now()}-${randomBytes(6).toString("hex")}`;
  const now = Timestamp.now();

  const requestedSlots = slots.map((s) => ({
    start: Timestamp.fromDate(new Date(s.start)),
    end: Timestamp.fromDate(new Date(s.end)),
  }));

  const ref = db.collection("discoveryCalls").doc();
  await ref.set({
    coachId: coachDoc.id,
    coachSlug: coachPublic.slug,
    coachName: coachPublic.name,
    userId: uid,
    userName,
    userEmail,
    orgId,
    source: orgId ? "enterprise" : "public",
    status: "requested",
    requestedSlots,
    confirmedSlot: null,
    userNote: String(userNote).slice(0, 500),
    meetingUrl: null,
    icsUid,
    actionTokenHash: tokenHash,
    actionTokenExpiresAt: Timestamp.fromDate(tokenExpiry),
    reminderSentAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Increment bookingRequests metric on coach doc — fire-and-forget
  privateSnap.ref.update({ "metrics.bookingRequests": FieldValue.increment(1) }).catch(() => {});

  const actionBaseUrl = `${APP_URL}/api/coaches/action?token=${rawToken}`;
  const declineUrl = `${actionBaseUrl}&callId=${ref.id}&action=decline`;

  const slotDates = slots.map((s) => new Date(s.start));

  // Send emails fire-and-forget
  sendCoachNewRequestEmail({
    coachEmail: coachPrivate.email as string,
    coachName: coachPublic.name as string,
    coachTimezone: coachPublic.timezone as string,
    userName,
    userNote,
    slots: slotDates,
    callDurationMins: (coachPublic.callDurationMins as number) ?? 30,
    callId: ref.id,
    actionBaseUrl: `${APP_URL}/api/coaches/action?token=${rawToken}`,
    declineUrl,
  }).catch(() => {});

  sendCoachRequestAckEmail({
    userEmail,
    userName,
    coachName: coachPublic.name as string,
    dashboardUrl: `${APP_URL}/dashboard/coaching`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, callId: ref.id });
}
