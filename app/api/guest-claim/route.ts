import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let guestToken: string;
  try {
    const body = await req.json();
    guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!guestToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const db = getAdminDb();

  const indexSnap = await db.collection("guest_token_index").doc(guestToken).get();
  if (!indexSnap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { assessmentId } = indexSnap.data()!;

  const docRef = db.collection("ai_assessments").doc(assessmentId as string);
  const snap = await docRef.get();

  if (!snap.exists || !snap.data()?.isGuest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (snap.data()?.claimedByUid) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  // Transfer ownership to the new account
  await docRef.update({
    presenterId: uid,
    claimedByUid: uid,
    isGuest: false,
    claimedAt: new Date(),
  });

  return NextResponse.json({ success: true, assessmentId });
}
