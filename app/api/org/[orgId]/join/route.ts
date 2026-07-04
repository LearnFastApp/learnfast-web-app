import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const db = getAdminDb();

  const tokenSnap = await db.doc(`org_invite_tokens/${token}`).get();
  if (!tokenSnap.exists) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const tokenData = tokenSnap.data()!;

  if (tokenData.orgId !== orgId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (tokenData.status !== "pending") {
    return NextResponse.json({ error: "token_already_used" }, { status: 409 });
  }
  const expiresAt = (tokenData.expiresAt as Timestamp).toDate();
  if (expiresAt < new Date()) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  // Resolve user email for validation
  const authUser = await getAdminAuth().getUser(uid).catch(() => null);
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Validate email matches invite (case-insensitive)
  const userEmail = authUser.email?.toLowerCase() ?? "";
  const inviteEmail = (tokenData.email as string).toLowerCase();
  if (userEmail !== inviteEmail) {
    return NextResponse.json({ error: "email_mismatch", invited: inviteEmail }, { status: 403 });
  }

  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  if (presenterSnap.data()?.orgId) {
    return NextResponse.json({ error: "already_in_org" }, { status: 409 });
  }

  const presenterEmail = presenterSnap.data()?.email as string ?? userEmail;
  const presenterName = presenterSnap.data()?.displayName as string ?? userEmail.split("@")[0];

  // Atomic transaction: verify capacity, create member, consume seat, mark token used
  await db.runTransaction(async (tx) => {
    const orgRef = db.doc(`organizations/${orgId}`);
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) throw new Error("org_not_found");

    const org = orgSnap.data()!;
    if (org.seats.used >= org.seats.purchased) throw Object.assign(new Error("no_seats"), { code: "no_seats_available" });

    const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists) throw Object.assign(new Error("already_member"), { code: "already_in_org" });

    const now = Timestamp.now();
    tx.set(memberRef, {
      role: tokenData.role,
      email: presenterEmail,
      displayName: presenterName,
      joinedAt: now,
      invitedBy: tokenData.inviteId,
      status: "active",
    });
    tx.update(orgRef, { "seats.used": FieldValue.increment(1) });
    tx.update(db.doc(`org_invite_tokens/${token}`), { status: "accepted" });
    tx.update(db.doc(`organizations/${orgId}/invites/${tokenData.inviteId}`), { status: "accepted" });
    tx.update(db.doc(`presenters/${uid}`), {
      orgId,
      orgRole: tokenData.role,
      subscriptionStatus: "lite",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Mark email as verified — the invite itself is the verification signal
  // (admin explicitly chose this email; requiring a separate verification email
  // would add friction with no security benefit for enterprise invites).
  await getAdminAuth().updateUser(uid, { emailVerified: true }).catch(() => null);

  return NextResponse.json({ orgId, role: tokenData.role });
}
