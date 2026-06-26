import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req); // null if unauthenticated — still allowed

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const db = getAdminDb();

  // Upsert by email — prevents duplicates
  const ref = db.collection("pro_waitlist").doc(
    Buffer.from(email).toString("base64url").slice(0, 100)
  );

  await ref.set(
    {
      email,
      uid: uid ?? null,
      signedUpAt: new Date(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
