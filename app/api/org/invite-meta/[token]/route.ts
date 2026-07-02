import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token } = await params;
  const db = getAdminDb();

  const tokenSnap = await db.doc(`org_invite_tokens/${token}`).get();
  if (!tokenSnap.exists) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const tokenData = tokenSnap.data()!;

  if (tokenData.status !== "pending") {
    return NextResponse.json({ error: "token_already_used" }, { status: 410 });
  }
  const expiresAt = (tokenData.expiresAt as Timestamp).toDate();
  if (expiresAt < new Date()) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  const orgId = tokenData.orgId as string;
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const org = orgSnap.data()!;

  // Fetch inviter display name
  const inviteSnap = await db.doc(`organizations/${orgId}/invites/${tokenData.inviteId}`).get();
  const inviterId = inviteSnap.data()?.createdBy as string | null;
  let inviterName = "Your admin";
  if (inviterId) {
    const inviterSnap = await db.doc(`presenters/${inviterId}`).get();
    inviterName = (inviterSnap.data()?.displayName as string) ?? inviterName;
  }

  return NextResponse.json({
    orgId,
    orgName: org.name as string,
    role: tokenData.role as string,
    email: tokenData.email as string,
    inviterName,
    expiresAt: expiresAt.toISOString(),
  });
}
