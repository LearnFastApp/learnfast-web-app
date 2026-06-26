import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { rateLimit, getIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(`webinars:${getIp(req)}`, 30, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const dimension = req.nextUrl.searchParams.get("dimension");
  if (!dimension) return NextResponse.json({ error: "Missing dimension" }, { status: 400 });

  await verifyAuthToken(req);

  const db = getAdminDb();
  const now = new Date();

  // Fetch all upcoming webinars, filter by dimension in memory
  // (avoids composite index requirement on dimensions + date)
  const snap = await db.collection("webinars")
    .where("date", ">=", Timestamp.fromDate(now))
    .orderBy("date", "asc")
    .limit(60)
    .get();

  const webinars = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title as string,
        url: data.url as string,
        source: data.source as string,
        date: (data.date as Timestamp).toDate().toISOString(),
        dimensions: data.dimensions as string[],
        description: data.description as string,
        isCurated: data.isCurated as boolean,
      };
    })
    .filter((w) => w.dimensions.includes(dimension))
    .sort((a, b) => {
      // Curated sources surface first, then date ascending
      if (a.isCurated && !b.isCurated) return -1;
      if (!a.isCurated && b.isCurated) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 8);

  return NextResponse.json({ webinars });
}
