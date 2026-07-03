import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const isCoach = hasOrgPermission(ctx.role, "coach");

  let snap;
  if (isCoach) {
    // Coaches+ see all assignments, ordered by due date
    snap = await db
      .collection(`organizations/${orgId}/assignments`)
      .orderBy("dueDate", "asc")
      .get();
  } else {
    // Members see only their own
    snap = await db
      .collection(`organizations/${orgId}/assignments`)
      .where("assignedTo", "==", uid)
      .orderBy("dueDate", "asc")
      .get();
  }

  const assignments = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName ?? null,
      assignedBy: data.assignedBy,
      assignedByName: data.assignedByName ?? null,
      title: data.title,
      prompt: data.prompt ?? null,
      dueDate: data.dueDate?.toDate?.()?.toISOString() ?? null,
      status: data.status,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "coach")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { assignedTo, title, prompt, dueDate } = body;
  if (!assignedTo?.trim()) return NextResponse.json({ error: "assignedTo_required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (!dueDate) return NextResponse.json({ error: "dueDate_required" }, { status: 400 });

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return NextResponse.json({ error: "invalid_dueDate" }, { status: 400 });

  const db = getAdminDb();

  // Verify assignedTo is an active org member
  const memberSnap = await db.doc(`organizations/${orgId}/members/${assignedTo}`).get();
  if (!memberSnap.exists || memberSnap.data()?.status !== "active") {
    return NextResponse.json({ error: "member_not_found" }, { status: 400 });
  }

  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  // Resolve display names
  const [assignerSnap, assigneeSnap] = await Promise.all([
    db.doc(`presenters/${uid}`).get(),
    db.doc(`presenters/${assignedTo}`).get(),
  ]);
  const assignedByName = assignerSnap.data()?.displayName ?? ctx.member.displayName ?? null;
  const assignedToName = assigneeSnap.data()?.displayName ?? memberSnap.data()?.displayName ?? null;

  const ref = db.collection(`organizations/${orgId}/assignments`).doc();
  await ref.set({
    assignedTo,
    assignedToName,
    assignedBy: uid,
    assignedByName,
    title: title.trim(),
    prompt: prompt?.trim() ?? null,
    dueDate: Timestamp.fromDate(due),
    status: "pending",
    completedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
