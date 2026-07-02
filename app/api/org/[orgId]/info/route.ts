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
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
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
  });
}
