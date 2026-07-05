import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_ENTERPRISE_PRICE_MONTHLY, STRIPE_ENTERPRISE_PRICE_ANNUAL } from "@/lib/stripe-server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { orgId, interval } = body as { orgId?: string; interval?: "monthly" | "annual" };

  if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });
  if (interval !== "monthly" && interval !== "annual") {
    return NextResponse.json({ error: "invalid_interval" }, { status: 400 });
  }

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "owner")) {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  const org = ctx.org;
  const eligibleStatuses = ["trialing", "active", "expired", "cancelled"];
  if (!eligibleStatuses.includes(org.subscriptionStatus as string)) {
    return NextResponse.json({ error: "org_not_eligible" }, { status: 409 });
  }

  const priceId = interval === "annual" ? STRIPE_ENTERPRISE_PRICE_ANNUAL : STRIPE_ENTERPRISE_PRICE_MONTHLY;
  if (!priceId) {
    return NextResponse.json({ error: "price_not_configured" }, { status: 503 });
  }

  const db = getAdminDb();
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  const email = presenterSnap.data()?.email as string | undefined;

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: org.seats.purchased }],
      success_url: `${APP_URL}/${orgId}/billing?success=true`,
      cancel_url: `${APP_URL}/${orgId}/billing?cancelled=true`,
      customer: org.stripeCustomerId ?? undefined,
      customer_email: !org.stripeCustomerId ? email : undefined,
      metadata: { orgId, seats: String(org.seats.purchased), interval },
      subscription_data: {
        metadata: { orgId, seats: String(org.seats.purchased) },
        // Honour the remaining trial period if it hasn't expired yet
        ...(() => {
          const trialEndsAt = (org.trialEndsAt as { toDate?: () => Date } | null)?.toDate?.();
          if (trialEndsAt && trialEndsAt > new Date()) {
            return { trial_end: Math.floor(trialEndsAt.getTime() / 1000) };
          }
          return {};
        })(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[enterprise-checkout] Stripe error:", msg);
    return NextResponse.json({ error: "stripe_error", detail: msg }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
