import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";
import type { OrgSessionStatus } from "@/types/enterprise";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrgSessionStatus[] = ["scheduled", "live", "completed", "cancelled"];

type Params = { params: Promise<{ orgId: string; sessionId: string }> };

async function getSessionDoc(orgId: string, sessionId: string) {
  const db = getAdminDb();
  const doc = await db.doc(`organizations/${orgId}/sessions/${sessionId}`).get();
  if (!doc.exists) return null;
  return doc;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, sessionId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await getSessionDoc(orgId, sessionId);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = hasOrgPermission(ctx.role, "admin");
  const isOwner = doc.data()?.presenterId === uid;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { FieldValue } = await import("firebase-admin/firestore");

  const allowed = ["title", "type", "timezone", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (updates.status && !VALID_STATUSES.includes(updates.status as OrgSessionStatus)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "no_changes" }, { status: 400 });

  await doc.ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });

  // When org session ends, close the linked consumer session so the feedback form closes
  if (updates.status === "completed" || updates.status === "cancelled") {
    const linkedId = doc.data()?.linkedConsumerSessionId as string | undefined;
    if (linkedId) {
      await getAdminDb().doc(`sessions/${linkedId}`).update({
        status: "closed",
        endedAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, sessionId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await getSessionDoc(orgId, sessionId);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Remove feedback code index entry too
  const feedbackCode = doc.data()?.feedbackCode as string | undefined;
  const db = getAdminDb();
  const batch = db.batch();
  batch.delete(doc.ref);
  if (feedbackCode) {
    batch.delete(db.collection("session_feedback_codes").doc(feedbackCode));
  }
  await batch.commit();

  return NextResponse.json({ ok: true });
}
