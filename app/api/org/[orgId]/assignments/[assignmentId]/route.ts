import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string; assignmentId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, assignmentId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const docRef = db.doc(`organizations/${orgId}/assignments/${assignmentId}`);
  const snap = await docRef.get();
  if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data = snap.data()!;
  const isCoach = hasOrgPermission(ctx.role, "coach");
  const isOwner = data.assignedTo === uid;

  if (!isCoach && !isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (isCoach) {
    // Coaches can update title, prompt, dueDate, status
    if (body.title?.trim()) updates.title = body.title.trim();
    if (body.prompt !== undefined) updates.prompt = body.prompt?.trim() ?? null;
    if (body.dueDate) {
      const due = new Date(body.dueDate);
      if (!isNaN(due.getTime())) updates.dueDate = Timestamp.fromDate(due);
    }
    if (body.status === "pending" || body.status === "completed") {
      updates.status = body.status;
      if (body.status === "completed") updates.completedAt = FieldValue.serverTimestamp();
      if (body.status === "pending") updates.completedAt = null;
    }
  } else {
    // Members can only mark their own assignment complete
    if (body.status === "completed") {
      updates.status = "completed";
      updates.completedAt = FieldValue.serverTimestamp();
    } else {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  await docRef.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, assignmentId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "coach")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  await db.doc(`organizations/${orgId}/assignments/${assignmentId}`).delete();
  return NextResponse.json({ ok: true });
}
