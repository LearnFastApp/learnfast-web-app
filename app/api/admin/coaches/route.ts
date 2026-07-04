import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminAuth, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const PLATFORM_ADMIN = "physicalperformance@icloud.com";
const SENSITIVE_FIELDS = ["email", "stripeCustomerId", "metrics", "meetingUrl"] as const;

async function assertAdmin(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return null;
  const record = await getAdminAuth().getUser(uid);
  return record.email === PLATFORM_ADMIN ? uid : null;
}

function toPublic(data: Record<string, unknown>) {
  const pub = { ...data };
  for (const f of SENSITIVE_FIELDS) delete pub[f];
  return pub;
}

async function syncPublic(db: FirebaseFirestore.Firestore, coachId: string, data: Record<string, unknown>) {
  await db.collection("coachesPublic").doc(coachId).set(toPublic(data), { merge: false });
}

// GET /api/admin/coaches — list all coaches
export async function GET(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getAdminDb();
  const snap = await db.collection("coaches").orderBy("createdAt", "desc").limit(200).get();
  const coaches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ coaches });
}

// POST /api/admin/coaches — create a new coach
export async function POST(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json() as Record<string, unknown>;

  const required = ["slug", "name", "email", "timezone", "meetingUrl", "headshotUrl", "quote", "bioShort", "bioLong", "credentials"];
  for (const field of required) {
    if (!body[field]) return NextResponse.json({ error: `${field}_required` }, { status: 400 });
  }

  const db = getAdminDb();

  // Ensure slug is unique
  const existing = await db.collection("coaches").where("slug", "==", body.slug).limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const now = Timestamp.now();
  const data: Record<string, unknown> = {
    slug: body.slug,
    status: "draft",
    name: body.name,
    headshotUrl: body.headshotUrl,
    quote: String(body.quote ?? "").slice(0, 140),
    bioShort: String(body.bioShort ?? "").slice(0, 280),
    bioLong: body.bioLong ?? "",
    specialties: Array.isArray(body.specialties) ? body.specialties : [],
    credentials: body.credentials ?? "",
    linkedinUrl: body.linkedinUrl ?? null,
    websiteUrl: body.websiteUrl ?? null,
    email: body.email,
    timezone: body.timezone,
    meetingUrl: body.meetingUrl,
    callDurationMins: Number(body.callDurationMins ?? 30),
    learnfastScore: body.learnfastScore != null ? Number(body.learnfastScore) : null,
    archetype: body.archetype ?? null,
    introVideoId: body.introVideoId ?? null,
    listingTier: body.listingTier ?? "standard",
    stripeCustomerId: null,
    metrics: { profileViews: 0, bookingRequests: 0, confirmedCalls: 0 },
    featured: false,
    createdAt: now,
    updatedAt: now,
  };

  const ref = db.collection("coaches").doc();
  await ref.set(data);
  await syncPublic(db, ref.id, { id: ref.id, ...data });

  return NextResponse.json({ id: ref.id });
}
