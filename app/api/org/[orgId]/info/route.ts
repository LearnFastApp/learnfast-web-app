import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);

  // Granular 403 to help diagnose membership issues
  if (!ctx) {
    const db = getAdminDb();
    const presSnap = await db.doc(`presenters/${uid}`).get();
    const storedOrgId = presSnap.data()?.orgId;
    if (!storedOrgId) {
      return NextResponse.json({ error: "no_org_on_account" }, { status: 403 });
    }
    const memberSnap = await db.doc(`organizations/${storedOrgId}/members/${uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "not_a_member", storedOrgId }, { status: 403 });
    }
    if (memberSnap.data()?.status !== "active") {
      return NextResponse.json({ error: "member_not_active", status: memberSnap.data()?.status, storedOrgId }, { status: 403 });
    }
    return NextResponse.json({ error: "org_not_found", storedOrgId }, { status: 403 });
  }
  if (ctx.orgId !== orgId) {
    return NextResponse.json({ error: "wrong_org", yourOrgId: ctx.orgId, requestedOrgId: orgId }, { status: 403 });
  }

  const db = getAdminDb();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  const org = orgSnap.data()!;

  return NextResponse.json({
    name: org.name,
    slug: org.slug,
    seats: org.seats,
    subscriptionStatus: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt instanceof Timestamp
      ? org.trialEndsAt.toDate().toISOString()
      : null,
    plan: org.plan,
    settings: org.settings,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    myRole: ctx.role,
  });
}
