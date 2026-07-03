import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const PLATFORM_ADMIN = "physicalperformance@icloud.com";

async function assertAdmin(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return null;
  const db = getAdminDb();
  const snap = await db.doc(`presenters/${uid}`).get();
  if (snap.data()?.email !== PLATFORM_ADMIN) return null;
  return uid;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const uid = await assertAdmin(req);
  if (!uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const doc = await db.collection("library_content").doc(contentId).get();
  if (!doc.exists || !doc.data()?.isPremium) return NextResponse.json({ error: "not_found" }, { status: 404 });

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  const uid = await assertAdmin(req);
  if (!uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const doc = await db.collection("library_content").doc(contentId).get();
  if (!doc.exists || !doc.data()?.isPremium) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await doc.ref.delete();
  return NextResponse.json({ ok: true });
}
