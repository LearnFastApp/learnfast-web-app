import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
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

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/coaches/[id]
export async function GET(req: NextRequest, { params }: Params) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getAdminDb();
  const snap = await db.collection("coaches").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ id: snap.id, ...snap.data() });
}

// PATCH /api/admin/coaches/[id] — update fields
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getAdminDb();
  const ref = db.collection("coaches").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json() as Record<string, unknown>;
  const ALLOWED = [
    "status", "name", "headshotUrl", "quote", "bioShort", "bioLong",
    "specialties", "credentials", "linkedinUrl", "websiteUrl", "email",
    "timezone", "meetingUrl", "callDurationMins", "learnfastScore",
    "archetype", "introVideoId", "listingTier", "featured",
  ];

  const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }
  if (update.quote) update.quote = String(update.quote).slice(0, 140);
  if (update.bioShort) update.bioShort = String(update.bioShort).slice(0, 280);

  await ref.update(update);

  // Sync public mirror — re-read to get full merged doc
  const updated = (await ref.get()).data()!;
  const pub = toPublic({ id, ...updated });
  await db.collection("coachesPublic").doc(id).set(pub, { merge: false });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/coaches/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getAdminDb();
  await db.collection("coaches").doc(id).delete();
  await db.collection("coachesPublic").doc(id).delete();
  return NextResponse.json({ ok: true });
}
