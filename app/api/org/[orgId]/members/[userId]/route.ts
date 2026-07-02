import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";
import type { OrgRole } from "@/types/enterprise";

export const dynamic = "force-dynamic";

const ROLE_HIERARCHY: OrgRole[] = ["member", "coach", "admin", "owner"];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId, userId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Cannot remove yourself as owner
  if (userId === uid && ctx.role === "owner") {
    return NextResponse.json({ error: "cannot_remove_owner" }, { status: 400 });
  }

  const db = getAdminDb();
  const targetMemberSnap = await db.doc(`organizations/${orgId}/members/${userId}`).get();
  if (!targetMemberSnap.exists) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  // Admins cannot remove other owners or admins of equal/higher rank
  const targetRole = targetMemberSnap.data()!.role as OrgRole;
  if (
    ctx.role !== "owner" &&
    ROLE_HIERARCHY.indexOf(targetRole) >= ROLE_HIERARCHY.indexOf(ctx.role)
  ) {
    return NextResponse.json({ error: "insufficient_rank" }, { status: 403 });
  }

  await db.runTransaction(async (tx) => {
    const orgRef = db.doc(`organizations/${orgId}`);
    tx.delete(db.doc(`organizations/${orgId}/members/${userId}`));
    tx.update(orgRef, { "seats.used": FieldValue.increment(-1) });
    tx.update(db.doc(`presenters/${userId}`), {
      orgId: FieldValue.delete(),
      orgRole: FieldValue.delete(),
    });
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId, userId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const newRole = typeof body.role === "string" ? body.role as OrgRole : null;

  if (!newRole || !ROLE_HIERARCHY.includes(newRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  if (newRole === "owner") {
    return NextResponse.json({ error: "use_transfer_ownership" }, { status: 400 });
  }
  // Admins cannot promote to/from roles above their own
  if (
    ctx.role !== "owner" &&
    ROLE_HIERARCHY.indexOf(newRole) >= ROLE_HIERARCHY.indexOf(ctx.role)
  ) {
    return NextResponse.json({ error: "insufficient_rank" }, { status: 403 });
  }

  const db = getAdminDb();
  const targetMemberRef = db.doc(`organizations/${orgId}/members/${userId}`);
  const targetMemberSnap = await targetMemberRef.get();
  if (!targetMemberSnap.exists) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }
  if (targetMemberSnap.data()!.role === "owner") {
    return NextResponse.json({ error: "cannot_change_owner_role" }, { status: 400 });
  }

  const batch = db.batch();
  batch.update(targetMemberRef, { role: newRole });
  batch.update(db.doc(`presenters/${userId}`), { orgRole: newRole });
  await batch.commit();

  return NextResponse.json({ success: true, role: newRole });
}
