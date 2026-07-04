import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId, inviteId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getAdminDb();
  const inviteRef = db.doc(`organizations/${orgId}/invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invite = inviteSnap.data()!;
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite_not_pending" }, { status: 409 });
  }

  const batch = db.batch();
  batch.delete(inviteRef);
  if (invite.token) {
    batch.delete(db.doc(`org_invite_tokens/${invite.token}`));
  }
  await batch.commit();

  return NextResponse.json({ ok: true });
}
