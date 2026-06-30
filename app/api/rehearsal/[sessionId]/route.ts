import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();

  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const [sessionSnap, takesSnap] = await Promise.all([
    sessionRef.get(),
    sessionRef.collection("takes").orderBy("takeNumber", "asc").get(),
  ]);

  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = { id: sessionSnap.id, ...sessionSnap.data() };
  const takes = takesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ session, takes });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();
  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json() as { tags?: string[] };
  if (!Array.isArray(body.tags)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await sessionRef.update({ tags: body.tags });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();
  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Delete all takes in the subcollection first
  const takesSnap = await sessionRef.collection("takes").get();
  const batch = db.batch();
  takesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(sessionRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
