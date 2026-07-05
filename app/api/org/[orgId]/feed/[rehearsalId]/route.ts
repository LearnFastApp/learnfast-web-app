import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string; rehearsalId: string }> };

// Remove a rehearsal from the org coaching feed (set isPublic: false).
// Allowed for the rehearsal's own presenter OR any org admin/owner.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, rehearsalId } = await params;

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getAdminDb();
  const sessionRef = db.collection("rehearsal_sessions").doc(rehearsalId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = sessionSnap.data()!;

  // Must belong to this org and be shared into the feed
  if (data.orgId !== orgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const isOwner = data.presenterId === uid;
  const isAdmin = hasOrgPermission(ctx.role, "admin");

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await sessionRef.update({ isPublic: false });
  return NextResponse.json({ ok: true });
}
