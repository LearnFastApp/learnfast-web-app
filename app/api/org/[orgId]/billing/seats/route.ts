import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import type Stripe from "stripe";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

// GET — proration preview for changing seat count
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "owner")) return NextResponse.json({ error: "owner_only" }, { status: 403 });

  const newSeats = parseInt(req.nextUrl.searchParams.get("seats") ?? "0", 10);
  if (!newSeats || newSeats < 5) return NextResponse.json({ error: "invalid_seats" }, { status: 400 });

  const org = ctx.org;
  if (!org.stripeSubscriptionId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 409 });
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return NextResponse.json({ error: "no_subscription_item" }, { status: 409 });

  const preview = await stripe.invoices.createPreview({
    customer: org.stripeCustomerId!,
    subscription: org.stripeSubscriptionId,
    subscription_details: { items: [{ id: itemId, quantity: newSeats }] },
  });

  const proratedAmount = preview.lines.data
    .filter((l: Stripe.InvoiceLineItem) => l.parent?.subscription_item_details?.proration === true)
    .reduce((sum: number, l: Stripe.InvoiceLineItem) => sum + l.amount, 0);

  return NextResponse.json({
    currentSeats: org.seats.purchased,
    newSeats,
    proratedAmountPence: proratedAmount,
    proratedAmountFormatted: `£${(Math.abs(proratedAmount) / 100).toFixed(2)}`,
    isCredit: proratedAmount < 0,
    nextInvoiceTotal: preview.total,
    nextInvoiceTotalFormatted: `£${(preview.total / 100).toFixed(2)}`,
    nextInvoiceDue: preview.next_payment_attempt
      ? new Date(preview.next_payment_attempt * 1000).toISOString()
      : null,
  });
}

// PATCH — commit seat count change
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "owner")) return NextResponse.json({ error: "owner_only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const newSeats = typeof body.seats === "number" ? body.seats : null;
  if (!newSeats || newSeats < 5) return NextResponse.json({ error: "invalid_seats" }, { status: 400 });

  const org = ctx.org;

  // Cannot reduce below current usage
  if (newSeats < org.seats.used) {
    return NextResponse.json({
      error: "seats_below_usage",
      used: org.seats.used,
      minimum: org.seats.used,
    }, { status: 409 });
  }

  if (!org.stripeSubscriptionId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 409 });
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return NextResponse.json({ error: "no_subscription_item" }, { status: 409 });

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    items: [{ id: itemId, quantity: newSeats }],
    proration_behavior: "always_invoice",
  });

  // Webhook (customer.subscription.updated) will sync seats.purchased
  return NextResponse.json({ success: true, seats: newSeats });
}
