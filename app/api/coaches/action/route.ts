import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  sendCoachConfirmedEmail,
  sendCoachDeclinedEmail,
} from "@/lib/email";
import { generateICS } from "@/lib/ics";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://learnfastapp.com";

// GET /api/coaches/action?token=&callId=&action=confirm|decline&slot=N
// Coach clicks magic link from Email A to confirm or decline
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const callId = searchParams.get("callId");
  const action = searchParams.get("action");
  const slotIndex = parseInt(searchParams.get("slot") ?? "0", 10);

  if (!token || !callId || !action) {
    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=invalid`);
  }

  const db = getAdminDb();
  const callRef = db.collection("discoveryCalls").doc(callId);
  const callSnap = await callRef.get();

  if (!callSnap.exists) {
    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=not_found`);
  }

  const call = callSnap.data()!;

  // Verify token hash
  const expectedHash = createHash("sha256").update(token).digest("hex");
  if (call.actionTokenHash !== expectedHash) {
    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=invalid_token`);
  }

  // Check expiry
  const expiresAt = (call.actionTokenExpiresAt as Timestamp).toDate();
  if (new Date() > expiresAt) {
    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=expired`);
  }

  // Must still be in requested state
  if (call.status !== "requested") {
    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=already_actioned`);
  }

  if (action === "decline") {
    await callRef.update({
      status: "declined",
      updatedAt: Timestamp.now(),
    });

    sendCoachDeclinedEmail({
      userEmail: call.userEmail as string,
      userName: call.userName as string,
      coachName: call.coachName as string,
      rosterUrl: `${APP_URL}/coaches`,
    }).catch(() => {});

    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=declined`);
  }

  if (action === "confirm") {
    const requestedSlots = call.requestedSlots as { start: Timestamp; end: Timestamp }[];
    if (slotIndex < 0 || slotIndex >= requestedSlots.length) {
      return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=invalid_slot`);
    }

    const confirmedSlot = requestedSlots[slotIndex];
    const confirmedStart = confirmedSlot.start.toDate();
    const confirmedEnd = confirmedSlot.end.toDate();

    // Load coach's private meetingUrl
    const coachSnap = await db.collection("coaches").doc(call.coachId as string).get();
    if (!coachSnap.exists) {
      return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=error`);
    }
    const coachData = coachSnap.data()!;
    const meetingUrl = coachData.meetingUrl as string;
    const coachTimezone = coachData.timezone as string;

    await callRef.update({
      status: "confirmed",
      confirmedSlot: { start: confirmedSlot.start, end: confirmedSlot.end },
      meetingUrl,
      updatedAt: Timestamp.now(),
    });

    // Increment confirmedCalls metric
    coachSnap.ref.update({ "metrics.confirmedCalls": FieldValue.increment(1) }).catch(() => {});

    // Build ICS
    const icsContent = generateICS({
      uid: call.icsUid as string,
      summary: `Discovery call: ${call.coachName} × ${call.userName}`,
      description: call.userNote
        ? `Topic: ${call.userNote as string}`
        : "LearnFast executive coaching discovery call",
      location: meetingUrl,
      start: confirmedStart,
      end: confirmedEnd,
      organizerEmail: coachData.email as string,
      organizerName: call.coachName as string,
      attendees: [
        { email: coachData.email as string, name: call.coachName as string },
        { email: call.userEmail as string, name: call.userName as string },
      ],
    });

    const dashboardUrl = `${APP_URL}/dashboard/coaching`;

    // Send confirmation to coach
    sendCoachConfirmedEmail({
      toEmail: coachData.email as string,
      toName: call.coachName as string,
      otherName: call.userName as string,
      coachName: call.coachName as string,
      userName: call.userName as string,
      confirmedStart,
      confirmedEnd,
      recipientTimezone: coachTimezone,
      meetingUrl,
      userNote: (call.userNote as string) ?? "",
      icsContent,
      dashboardUrl,
    }).catch(() => {});

    // Send confirmation to user — need user's timezone, fall back to UTC
    const userSubDoc = await db.collection("users").doc(call.userId as string).get();
    const userTimezone = (userSubDoc.data()?.timezone as string | undefined) ?? "UTC";

    sendCoachConfirmedEmail({
      toEmail: call.userEmail as string,
      toName: call.userName as string,
      otherName: call.coachName as string,
      coachName: call.coachName as string,
      userName: call.userName as string,
      confirmedStart,
      confirmedEnd,
      recipientTimezone: userTimezone,
      meetingUrl,
      userNote: (call.userNote as string) ?? "",
      icsContent,
      dashboardUrl,
    }).catch(() => {});

    return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=confirmed`);
  }

  return NextResponse.redirect(`${APP_URL}/coaches/booking-result?outcome=invalid`);
}
