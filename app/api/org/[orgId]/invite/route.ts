import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";
import { sendOrgInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const role = typeof body.role === "string" ? body.role : "member";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!["member", "coach", "admin"].includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const db = getAdminDb();
  const org = ctx.org;

  // Capacity check
  if (org.seats.used >= org.seats.purchased) {
    return NextResponse.json({ error: "no_seats_available" }, { status: 409 });
  }

  // Check for existing pending invite to same email
  const existingSnap = await db
    .collection(`organizations/${orgId}/invites`)
    .where("email", "==", email)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    return NextResponse.json({ error: "invite_already_pending" }, { status: 409 });
  }

  const token = generateToken();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  );

  const inviteRef = db.collection(`organizations/${orgId}/invites`).doc();
  const inviteData = {
    email,
    role,
    token,
    createdAt: now,
    expiresAt,
    status: "pending",
    createdBy: uid,
  };

  // Write invite doc + top-level token doc (O(1) lookup on accept)
  const batch = db.batch();
  batch.set(inviteRef, inviteData);
  batch.set(db.doc(`org_invite_tokens/${token}`), {
    orgId,
    inviteId: inviteRef.id,
    email,
    role,
    expiresAt,
    status: "pending",
  });
  await batch.commit();

  const appUrl = process.env.APP_URL ?? "https://learnfastapp.com";
  const acceptUrl = `${appUrl}/org/join/${token}`;

  let emailSent = true;
  try {
    await sendOrgInviteEmail(
      email,
      org.name,
      ctx.member.displayName,
      acceptUrl,
      expiresAt.toDate()
    );
  } catch (err) {
    // Email delivery is best-effort. Invite is already written; admin can share
    // the accept link manually. Logs the error but does not fail the request.
    console.error("[org/invite] sendOrgInviteEmail failed:", err);
    emailSent = false;
  }

  return NextResponse.json({ inviteId: inviteRef.id, acceptUrl, emailSent }, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection(`organizations/${orgId}/invites`)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .get();

  const invites = snap.docs.map((d) => ({
    id: d.id,
    email: d.data().email,
    role: d.data().role,
    createdAt: d.data().createdAt?.toDate().toISOString() ?? null,
    expiresAt: d.data().expiresAt?.toDate().toISOString() ?? null,
  }));

  return NextResponse.json({ invites });
}
