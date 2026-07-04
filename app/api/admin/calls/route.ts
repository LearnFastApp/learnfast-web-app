import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const PLATFORM_ADMIN = "physicalperformance@icloud.com";

async function assertAdmin(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return null;
  const record = await getAdminAuth().getUser(uid);
  return record.email === PLATFORM_ADMIN ? uid : null;
}

// GET /api/admin/calls?status=&coachId=&source=&orgId=
export async function GET(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const coachId = searchParams.get("coachId");
  const source = searchParams.get("source");
  const orgId = searchParams.get("orgId");

  const db = getAdminDb();
  let query: FirebaseFirestore.Query = db.collection("discoveryCalls").orderBy("createdAt", "desc").limit(200);

  if (statusFilter) query = query.where("status", "==", statusFilter);
  if (coachId) query = query.where("coachId", "==", coachId);
  if (source) query = query.where("source", "==", source);
  if (orgId) query = query.where("orgId", "==", orgId);

  const snap = await query.get();
  const calls = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      actionTokenExpiresAt: data.actionTokenExpiresAt?.toDate?.()?.toISOString() ?? null,
      requestedSlots: (data.requestedSlots ?? []).map((s: { start: FirebaseFirestore.Timestamp; end: FirebaseFirestore.Timestamp }) => ({
        start: s.start?.toDate?.()?.toISOString() ?? null,
        end: s.end?.toDate?.()?.toISOString() ?? null,
      })),
      confirmedSlot: data.confirmedSlot ? {
        start: data.confirmedSlot.start?.toDate?.()?.toISOString() ?? null,
        end: data.confirmedSlot.end?.toDate?.()?.toISOString() ?? null,
      } : null,
    };
  });

  return NextResponse.json({ calls });
}
