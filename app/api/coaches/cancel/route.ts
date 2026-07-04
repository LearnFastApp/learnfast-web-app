import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { sendCoachCancelledEmail } from "@/lib/email";
import { generateCancelICS } from "@/lib/ics";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://learnfastapp.com";

// POST /api/coaches/cancel — user cancels their discovery call
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { callId } = await req.json() as { callId?: string };
  if (!callId) return NextResponse.json({ error: "callId_required" }, { status: 400 });

  const db = getAdminDb();
  const callRef = db.collection("discoveryCalls").doc(callId);
  const callSnap = await callRef.get();

  if (!callSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const call = callSnap.data()!;

  if (call.userId !== uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!["requested", "confirmed"].includes(call.status as string)) {
    return NextResponse.json({ error: "cannot_cancel" }, { status: 409 });
  }

  const wasConfirmed = call.status === "confirmed";

  await callRef.update({
    status: "cancelled",
    updatedAt: Timestamp.now(),
  });

  if (wasConfirmed && call.confirmedSlot) {
    const confirmedSlot = call.confirmedSlot as { start: Timestamp; end: Timestamp };
    const confirmedStart = confirmedSlot.start.toDate();
    const confirmedEnd = confirmedSlot.end.toDate();

    // Load coach private data for email + ICS
    const coachSnap = await db.collection("coaches").doc(call.coachId as string).get();
    const coachData = coachSnap.data() ?? {};

    const cancelIcs = generateCancelICS({
      uid: call.icsUid as string,
      summary: `Discovery call: ${call.coachName} × ${call.userName}`,
      start: confirmedStart,
      end: confirmedEnd,
      organizerEmail: coachData.email as string,
      organizerName: call.coachName as string,
      attendees: [
        { email: coachData.email as string, name: call.coachName as string },
        { email: call.userEmail as string, name: call.userName as string },
      ],
    });

    // Notify coach with cancel ICS
    sendCoachCancelledEmail({
      toEmail: coachData.email as string,
      toName: call.coachName as string,
      cancelledByName: call.userName as string,
      coachName: call.coachName as string,
      userName: call.userName as string,
      confirmedStart,
      recipientTimezone: coachData.timezone as string,
      icsContent: cancelIcs,
      rosterUrl: `${APP_URL}/coaches`,
    }).catch(() => {});
  } else {
    // Just requested — let coach know no action needed
    // No email needed for a simple pending-request cancel
  }

  return NextResponse.json({ ok: true });
}
