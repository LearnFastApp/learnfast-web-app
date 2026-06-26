import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendWebinarDigestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const DIMS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMS)[number];

const DIM_LABELS_EN: Record<Dimension, string> = {
  clarity: "Clarity", engagement: "Engagement", energy: "Energy",
  understanding: "Understanding", connection: "Connection",
};
const DIM_LABELS_FR: Record<Dimension, string> = {
  clarity: "Clarté", engagement: "Engagement", energy: "Énergie",
  understanding: "Compréhension", connection: "Connexion",
};

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();
  const appUrl = process.env.APP_URL || "https://learnfastapp.com";

  // Fetch all upcoming webinars (next 30 days)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const webinarSnap = await db.collection("webinars")
    .where("date", ">=", Timestamp.fromDate(now))
    .where("date", "<=", Timestamp.fromDate(in30Days))
    .orderBy("date", "asc")
    .get();

  if (webinarSnap.empty) {
    return NextResponse.json({ sent: 0, reason: "no upcoming webinars" });
  }

  // Find active presenters who have at least one session
  // Only send to those who haven't received a digest in the last 6 days
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const presentersSnap = await db.collection("presenters").get();

  let sent = 0;
  let skipped = 0;

  for (const presenterDoc of presentersSnap.docs) {
    const data = presenterDoc.data();
    if (!data.email) { skipped++; continue; }

    // Skip if digest sent within 6 days
    const lastDigest = data.webinarDigestSentAt?.toDate?.() as Date | undefined;
    if (lastDigest && lastDigest > sixDaysAgo) { skipped++; continue; }

    // Check they have at least one session
    const sessionSnap = await db.collection("sessions")
      .where("presenterId", "==", presenterDoc.id)
      .where("status", "==", "closed")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (sessionSnap.empty) { skipped++; continue; }

    // Find their lowest-scoring dimension from most recent session
    const sessionId = sessionSnap.docs[0].id;
    const responsesSnap = await db.collection("feedback_responses")
      .where("sessionId", "==", sessionId)
      .get();

    if (responsesSnap.empty) { skipped++; continue; }

    const responses = responsesSnap.docs.map((d) => d.data());
    const averages = DIMS.reduce((acc, dim) => {
      const vals = responses.map((r) => r[dim] as number).filter((v) => typeof v === "number");
      acc[dim] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 100;
      return acc;
    }, {} as Record<Dimension, number>);

    const lowestDim = DIMS.reduce((a, b) => averages[a] < averages[b] ? a : b);
    const locale = (data.locale as string | undefined) ?? "en";
    const isFr = locale === "fr";

    // Filter webinars for this dimension
    const matchedWebinars = webinarSnap.docs
      .filter((d) => (d.data().dimensions as string[]).includes(lowestDim))
      .sort((a, b) => {
        const ac = a.data(); const bc = b.data();
        if (ac.isCurated && !bc.isCurated) return -1;
        if (!ac.isCurated && bc.isCurated) return 1;
        return (ac.date as Timestamp).toMillis() - (bc.date as Timestamp).toMillis();
      })
      .slice(0, 3)
      .map((d) => {
        const wd = d.data();
        return {
          title: wd.title as string,
          url: wd.url as string,
          source: wd.source as string,
          dateLabel: formatDate((wd.date as Timestamp).toDate(), locale),
        };
      });

    if (matchedWebinars.length === 0) { skipped++; continue; }

    try {
      const name = (data.displayName as string | undefined)?.split(" ")[0] || "there";
      const dimLabels = isFr ? DIM_LABELS_FR : DIM_LABELS_EN;

      await sendWebinarDigestEmail({
        to: data.email as string,
        presenterName: name,
        dimensionLabel: dimLabels[lowestDim],
        webinars: matchedWebinars,
        dashboardUrl: `${appUrl}/dashboard`,
        locale,
      });

      await presenterDoc.ref.update({ webinarDigestSentAt: Timestamp.fromDate(now) });
      sent++;
    } catch (err) {
      console.error(`[webinar-digest] Failed for ${presenterDoc.id}:`, err);
    }
  }

  return NextResponse.json({ sent, skipped, webinars_available: webinarSnap.size });
}
