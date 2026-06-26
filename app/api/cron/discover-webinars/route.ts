import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchEventBriteWebinars, getCuratedWebinars, WebinarEntry } from "@/lib/webinar-sources";

export const dynamic = "force-dynamic";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "EventBrite API key not configured" }, { status: 500 });
  }

  const db = getAdminDb();
  const now = new Date();

  // 1 — Delete expired webinars
  const expiredSnap = await db.collection("webinars")
    .where("date", "<", Timestamp.fromDate(now))
    .get();
  await Promise.all(expiredSnap.docs.map((d) => d.ref.delete()));

  // 2 — Discover via EventBrite (deduplicated by ID)
  const discovered = new Map<string, WebinarEntry>();

  for (const dimension of DIMENSIONS) {
    const results = await fetchEventBriteWebinars(dimension, apiKey);
    for (const entry of results) discovered.set(entry.id, entry);
    await new Promise((r) => setTimeout(r, 250)); // rate-limit courtesy delay
  }

  // 3 — Merge curated sources
  for (const entry of getCuratedWebinars()) discovered.set(entry.id, entry);

  // 4 — Upsert to Firestore in batches of 499
  let batch = db.batch();
  let batchCount = 0;

  for (const entry of discovered.values()) {
    const ref = db.collection("webinars").doc(entry.id);
    batch.set(
      ref,
      {
        title: entry.title,
        url: entry.url,
        source: entry.source,
        date: Timestamp.fromDate(entry.date),
        dimensions: entry.dimensions,
        description: entry.description,
        isCurated: entry.isCurated,
        discoveredAt: Timestamp.fromDate(now),
      },
      { merge: true }
    );
    batchCount++;
    if (batchCount % 499 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();

  return NextResponse.json({
    expired_deleted: expiredSnap.size,
    discovered: discovered.size,
    curated: getCuratedWebinars().length,
  });
}
