import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : null;

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const db = getAdminDb();
  const tokenRef = db.doc(`email_verifications/${token}`);
  const tokenSnap = await tokenRef.get();

  if (!tokenSnap.exists) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const data = tokenSnap.data()!;
  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;

  if (!expiresAt || expiresAt < new Date()) {
    await tokenRef.delete();
    return NextResponse.json({ error: "token_expired" }, { status: 400 });
  }

  const uid = data.uid as string;

  await getAdminAuth().updateUser(uid, { emailVerified: true });
  await tokenRef.delete();

  return NextResponse.json({ ok: true });
}
