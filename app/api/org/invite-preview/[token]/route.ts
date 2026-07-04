import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Public endpoint — no auth required. Returns just enough for the join page
// to render the org name and pre-fill the email before the user is signed in.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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

  return NextResponse.json({
    orgId,
    orgName: orgSnap.data()!.name as string,
    role: tokenData.role as string,
    email: tokenData.email as string,
    expiresAt: expiresAt.toISOString(),
  });
}
