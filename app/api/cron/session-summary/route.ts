import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { dispatchSessionSummary } from "@/lib/session-summary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(now - 72 * 60 * 60 * 1000);

  const sessionsSnap = await db.collection("sessions")
    .where("summarySent", "==", false)
    .get();

  // Filter in memory to avoid composite index requirement
  const due = sessionsSnap.docs.filter((d) => {
    const createdAt: Date | undefined = d.data().createdAt?.toDate?.();
    if (!createdAt) return false;
    return createdAt <= twentyFourHoursAgo && createdAt >= seventyTwoHoursAgo;
  });

  let sent = 0;

  for (const sessionDoc of due) {
    try {
      const outcome = await dispatchSessionSummary(sessionDoc.id);
      if (outcome === "sent") sent++;
    } catch (err) {
      console.error(`[cron/session-summary] Failed for session ${sessionDoc.id}:`, err);
    }
  }

  return NextResponse.json({ sent, checked: due.length });
}
