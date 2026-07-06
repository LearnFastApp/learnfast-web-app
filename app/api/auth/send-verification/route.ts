import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { sendEmailVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";
const EXPIRY_MS = 24 * 60 * 60 * 1000;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  if (!presenterSnap.exists) {
    return NextResponse.json({ error: "presenter_not_found" }, { status: 404 });
  }

  const email = presenterSnap.data()!.email as string | undefined;
  const displayName = (presenterSnap.data()!.displayName as string | undefined) ?? "there";

  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  const token = generateToken();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + EXPIRY_MS));

  // Delete any existing unused tokens for this user to keep Firestore tidy
  const existing = await db
    .collection("email_verifications")
    .where("uid", "==", uid)
    .get();
  const batch = db.batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  batch.set(db.doc(`email_verifications/${token}`), { uid, email, expiresAt });
  await batch.commit();

  const verifyUrl = `${APP_URL}/auth/verify?t=${token}`;

  await sendEmailVerificationEmail({ to: email, displayName, verifyUrl });

  return NextResponse.json({ ok: true });
}
