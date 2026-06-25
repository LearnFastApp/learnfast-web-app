import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendActivationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 3 days ago
  const windowEnd = new Date(now.getTime() - 48 * 60 * 60 * 1000);   // 2 days ago

  // Find presenters who signed up 48-72 hours ago
  const snap = await db.collection("presenters")
    .where("createdAt", ">=", Timestamp.fromDate(windowStart))
    .where("createdAt", "<", Timestamp.fromDate(windowEnd))
    .get();

  let sent = 0;
  let skipped = 0;

  for (const presenterDoc of snap.docs) {
    const data = presenterDoc.data();

    // Skip if we've already sent this email
    if (data.activationEmailSent) { skipped++; continue; }

    // Skip if no email on record
    if (!data.email) { skipped++; continue; }

    // Check if they've already created at least one session
    const sessionSnap = await db.collection("sessions")
      .where("presenterId", "==", presenterDoc.id)
      .limit(1)
      .get();

    if (!sessionSnap.empty) {
      // Already activated — mark so we don't check again
      await presenterDoc.ref.update({ activationEmailSent: true });
      skipped++;
      continue;
    }

    // Send the nudge email
    try {
      const name = (data.displayName as string | undefined)?.split(" ")[0] || "there";
      const appUrl = process.env.APP_URL || "https://learnfast-app-cc98c.web.app";

      await sendActivationEmail({
        to: data.email as string,
        presenterName: name,
        dashboardUrl: `${appUrl}/dashboard`,
      });

      await presenterDoc.ref.update({ activationEmailSent: true });
      sent++;
    } catch (err) {
      console.error(`[activation-nudge] Failed to send to ${presenterDoc.id}:`, err);
    }
  }

  return NextResponse.json({
    checked: snap.size,
    sent,
    skipped,
  });
}
