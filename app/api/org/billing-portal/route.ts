import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { orgId } = body as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "owner")) return NextResponse.json({ error: "owner_only" }, { status: 403 });

  const db = getAdminDb();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  const customerId = orgSnap.data()?.stripeCustomerId as string | null;
  if (!customerId) return NextResponse.json({ error: "no_customer" }, { status: 409 });

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/${orgId}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
