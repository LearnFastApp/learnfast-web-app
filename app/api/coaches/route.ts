import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/coaches?specialty=&featured=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const featuredOnly = searchParams.get("featured") === "true";

  const db = getAdminDb();
  let q: FirebaseFirestore.Query = db
    .collection("coachesPublic")
    .where("status", "==", "live");

  if (featuredOnly) q = q.where("featured", "==", true);

  const snap = await q.get();

  let coaches = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: data.slug as string,
      status: data.status as string,
      name: data.name as string,
      headshotUrl: data.headshotUrl as string,
      quote: data.quote as string,
      bioShort: data.bioShort as string,
      specialties: (data.specialties as string[]) ?? [],
      credentials: data.credentials as string,
      linkedinUrl: (data.linkedinUrl as string | null) ?? null,
      websiteUrl: (data.websiteUrl as string | null) ?? null,
      timezone: data.timezone as string,
      callDurationMins: (data.callDurationMins as number) ?? 30,
      learnfastScore: (data.learnfastScore as number | null) ?? null,
      archetype: (data.archetype as string | null) ?? null,
      introVideoId: (data.introVideoId as string | null) ?? null,
      listingTier: data.listingTier as string,
      featured: (data.featured as boolean) ?? false,
    };
  });

  if (specialty) {
    coaches = coaches.filter((c) => c.specialties.includes(specialty));
  }

  // Sort: founding tier first, then featured, then name
  coaches.sort((a, b) => {
    if (a.listingTier === "founding" && b.listingTier !== "founding") return -1;
    if (b.listingTier === "founding" && a.listingTier !== "founding") return 1;
    if (a.featured && !b.featured) return -1;
    if (b.featured && !a.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ coaches });
}
