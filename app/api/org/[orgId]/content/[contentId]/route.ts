import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";
import { hasOrgPermission } from "@/lib/org-permissions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string; contentId: string }> };

async function getContentDoc(orgId: string, contentId: string) {
  const db = getAdminDb();
  const doc = await db.collection("library_content").doc(contentId).get();
  if (!doc.exists || doc.data()?.orgId !== orgId) return null;
  return doc;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, contentId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await getContentDoc(orgId, contentId);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const allowed = ["title", "description", "url", "dimension", "isVisible", "fileUrl", "fileName", "storageRef"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "no_changes" }, { status: 400 });

  const { FieldValue } = await import("firebase-admin/firestore");
  await doc.ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, contentId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await getContentDoc(orgId, contentId);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await doc.ref.delete();
  return NextResponse.json({ ok: true });
}
