import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendCoachReminderEmail, sendCoachExpiredEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://learnfastapp.com";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();

  const results = { reminders: 0, expired: 0 };

  // ── Reminders ─────────────────────────────────────────────────────────────
  // Find confirmed calls 23–25h from now that haven't had a reminder sent
  const reminderWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const confirmedSnap = await db
    .collection("discoveryCalls")
    .where("status", "==", "confirmed")
    .where("reminderSentAt", "==", null)
    .get();

  for (const callDoc of confirmedSnap.docs) {
    const call = callDoc.data();
    const confirmedSlot = call.confirmedSlot as { start: Timestamp; end: Timestamp } | null;
    if (!confirmedSlot) continue;

    const confirmedStart = confirmedSlot.start.toDate();
    if (confirmedStart < reminderWindowStart || confirmedStart > reminderWindowEnd) continue;

    const confirmedEnd = confirmedSlot.end.toDate();

    // Load coach private data
    const coachSnap = await db.collection("coaches").doc(call.coachId as string).get();
    const coachData = coachSnap.data();
    if (!coachData) continue;

    const meetingUrl = (call.meetingUrl ?? coachData.meetingUrl) as string;
    const coachTimezone = coachData.timezone as string;

    // Get user's timezone from their presenter doc
    const userSnap = await db.collection("users").doc(call.userId as string).get();
    const userTimezone = (userSnap.data()?.timezone as string | undefined) ?? "UTC";

    // Send reminder to coach
    sendCoachReminderEmail({
      toEmail: coachData.email as string,
      toName: call.coachName as string,
      coachName: call.coachName as string,
      userName: call.userName as string,
      confirmedStart,
      recipientTimezone: coachTimezone,
      meetingUrl,
    }).catch(() => {});

    // Send reminder to user
    sendCoachReminderEmail({
      toEmail: call.userEmail as string,
      toName: call.userName as string,
      coachName: call.coachName as string,
      userName: call.userName as string,
      confirmedStart,
      recipientTimezone: userTimezone,
      meetingUrl,
    }).catch(() => {});

    await callDoc.ref.update({ reminderSentAt: Timestamp.now(), updatedAt: Timestamp.now() });
    results.reminders++;
  }

  // ── Expiry ─────────────────────────────────────────────────────────────────
  // Find requested calls where token expired more than 1h ago (grace period)
  const expiryThreshold = Timestamp.fromDate(new Date(now.getTime() - 60 * 60 * 1000));

  const requestedSnap = await db
    .collection("discoveryCalls")
    .where("status", "==", "requested")
    .where("actionTokenExpiresAt", "<=", expiryThreshold)
    .get();

  for (const callDoc of requestedSnap.docs) {
    const call = callDoc.data();

    await callDoc.ref.update({ status: "expired", updatedAt: Timestamp.now() });

    sendCoachExpiredEmail({
      userEmail: call.userEmail as string,
      userName: call.userName as string,
      coachName: call.coachName as string,
      rosterUrl: `${APP_URL}/coaches`,
    }).catch(() => {});

    results.expired++;
  }

  return NextResponse.json({ ok: true, ...results });
}
