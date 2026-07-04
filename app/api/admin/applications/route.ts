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

// GET — list all applications
export async function GET(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getAdminDb();
  const snap = await db.collection("coachApplications").orderBy("createdAt", "desc").limit(100).get();
  const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ applications });
}

// PATCH — update application status (accept / reject)
export async function PATCH(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id, status } = await req.json() as { id: string; status: "accepted" | "rejected" };
  if (!id || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const db = getAdminDb();
  await db.collection("coachApplications").doc(id).update({ status });
  return NextResponse.json({ ok: true });
}
