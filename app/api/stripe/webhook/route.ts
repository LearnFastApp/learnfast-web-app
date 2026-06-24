import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const adminDb = getAdminDb();

  // Idempotency: skip events we've already processed
  const eventRef = adminDb.collection("stripe_events").doc(event.id);
  const existing = await eventRef.get();
  if (existing.exists) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUid;
        if (!uid) break;
        await adminDb.doc(`presenters/${uid}`).set(
          {
            subscriptionStatus: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
          { merge: true }
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const snap = await adminDb
          .collection("presenters")
          .where("stripeCustomerId", "==", sub.customer as string)
          .limit(1)
          .get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ subscriptionStatus: "free" });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const snap = await adminDb
          .collection("presenters")
          .where("stripeCustomerId", "==", sub.customer as string)
          .limit(1)
          .get();
        if (!snap.empty) {
          const status = sub.status === "active" ? "active" : "free";
          await snap.docs[0].ref.update({ subscriptionStatus: status });
        }
        break;
      }
    }

    // Mark event as processed only after successful handling
    await eventRef.set({ processedAt: FieldValue.serverTimestamp(), type: event.type });

  } catch (err) {
    console.error("[webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
