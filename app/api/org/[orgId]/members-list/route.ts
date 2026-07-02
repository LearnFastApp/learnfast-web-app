import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection(`organizations/${orgId}/members`)
    .orderBy("joinedAt", "asc")
    .get();

  const members = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      displayName: data.displayName ?? data.email ?? d.id,
      email: data.email ?? "",
      role: data.role,
      status: data.status,
      joinedAt: data.joinedAt instanceof Timestamp
        ? data.joinedAt.toDate().toISOString()
        : null,
    };
  });

  return NextResponse.json({ members, myRole: ctx.role });
}
