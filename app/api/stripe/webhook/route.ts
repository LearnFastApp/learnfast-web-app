import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { logEvent } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const PAST_DUE_GRACE_DAYS = 14;

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

      // ── checkout.session.completed ────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;

        if (orgId) {
          // ── Enterprise org checkout ──────────────────────────────────────
          const seats = parseInt(session.metadata?.seats ?? "5", 10);
          await adminDb.doc(`organizations/${orgId}`).update({
            subscriptionStatus: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            "seats.purchased": seats,
            trialEndsAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Log to billingEvents for audit trail
          await adminDb.collection("billingEvents").doc(event.id).set({
            type: "enterprise_checkout_completed",
            orgId,
            seats,
            stripeEventId: event.id,
            createdAt: FieldValue.serverTimestamp(),
          });

          logEvent("funnel.subscription_started", {
            org_id: orgId,
            payload: { plan: "enterprise", seats, stripe_event_id: event.id },
          });

          // P2-6: Team→Enterprise upgrade — if the owner had a consumer Pro
          // subscription, cancel it and tag the presenter doc.
          const firebaseUid = session.metadata?.firebaseUid;
          if (firebaseUid) {
            const presenterSnap = await adminDb.doc(`presenters/${firebaseUid}`).get();
            const oldSubId = presenterSnap.data()?.stripeSubscriptionId as string | null;
            if (oldSubId && oldSubId !== (session.subscription as string)) {
              try {
                await getStripe().subscriptions.cancel(oldSubId);
              } catch (cancelErr) {
                console.warn("[webhook] could not cancel old consumer sub:", cancelErr);
              }
            }
            await adminDb.doc(`presenters/${firebaseUid}`).update({
              subscriptionStatus: "enterprise",
              orgId,
            });
          }
        } else {
          // ── Consumer Pro checkout (existing behaviour) ───────────────────
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
          // Look up user_key for the event log (fire-and-forget)
          adminDb.collection("presenters").doc(uid).get().then((snap) => {
            const user_key = snap.data()?.user_key as string | undefined;
            logEvent("funnel.subscription_started", {
              user_key: user_key ?? null,
              payload: { plan: "lite", stripe_event_id: event.id },
            });
          }).catch(() => {});
        }
        break;
      }

      // ── customer.subscription.updated ─────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;

        if (orgId) {
          // Enterprise subscription update
          const seats = sub.items.data[0]?.quantity ?? null;
          const updates: Record<string, unknown> = {
            subscriptionStatus: sub.status === "active" ? "active"
              : sub.status === "past_due" ? "past_due"
              : sub.status === "canceled" ? "cancelled"
              : sub.status,
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (seats !== null) updates["seats.purchased"] = seats;
          await adminDb.doc(`organizations/${orgId}`).update(updates);
        } else {
          // Consumer subscription update
          const snap = await adminDb
            .collection("presenters")
            .where("stripeCustomerId", "==", sub.customer as string)
            .limit(1)
            .get();
          if (!snap.empty) {
            const status = sub.status === "active" ? "active" : "free";
            await snap.docs[0].ref.update({ subscriptionStatus: status });
          }
        }
        break;
      }

      // ── customer.subscription.deleted ─────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;

        if (orgId) {
          await adminDb.doc(`organizations/${orgId}`).update({
            subscriptionStatus: "cancelled",
            updatedAt: FieldValue.serverTimestamp(),
          });
          await adminDb.collection("billingEvents").doc(event.id).set({
            type: "enterprise_subscription_cancelled",
            orgId,
            stripeEventId: event.id,
            createdAt: FieldValue.serverTimestamp(),
          });
          logEvent("funnel.subscription_cancelled", {
            org_id: orgId,
            payload: { plan: "enterprise", stripe_event_id: event.id },
          });
        } else {
          // Consumer subscription cancelled
          const snap = await adminDb
            .collection("presenters")
            .where("stripeCustomerId", "==", sub.customer as string)
            .limit(1)
            .get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({ subscriptionStatus: "free" });
            const user_key = snap.docs[0].data().user_key as string | undefined;
            logEvent("funnel.subscription_cancelled", {
              user_key: user_key ?? null,
              payload: { plan: "lite", stripe_event_id: event.id },
            });
          }
        }
        break;
      }

      // ── invoice.payment_failed ────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string | null;
        const sub = subscriptionId
          ? await getStripe().subscriptions.retrieve(subscriptionId)
          : null;
        const orgId = sub?.metadata?.orgId;

        if (orgId) {
          const graceEndsAt = Timestamp.fromDate(
            new Date(Date.now() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)
          );
          await adminDb.doc(`organizations/${orgId}`).update({
            subscriptionStatus: "past_due",
            pastDueGraceEndsAt: graceEndsAt,
            updatedAt: FieldValue.serverTimestamp(),
          });
          await adminDb.collection("billingEvents").doc(event.id).set({
            type: "enterprise_payment_failed",
            orgId,
            graceEndsAt,
            stripeEventId: event.id,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      // ── invoice.paid ──────────────────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string | null;
        const sub = subscriptionId
          ? await getStripe().subscriptions.retrieve(subscriptionId)
          : null;
        const orgId = sub?.metadata?.orgId;

        if (orgId) {
          await adminDb.doc(`organizations/${orgId}`).update({
            subscriptionStatus: "active",
            pastDueGraceEndsAt: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });
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
