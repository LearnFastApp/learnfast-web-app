import Stripe from "stripe";

let _stripe: Stripe | null = null;
let _stripeKey: string | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY!;
  if (!_stripe || _stripeKey !== key) {
    _stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" as const });
    _stripeKey = key;
  }
  return _stripe;
}

export const STRIPE_PRICE_ID = "price_1TlD2CIeBDkjGPKbvGn4LGLj";

// Enterprise per-seat prices — set via Firebase secrets after creating
// products in Stripe Dashboard (test mode). See Phase 2 setup notes.
export const STRIPE_ENTERPRISE_PRICE_MONTHLY = process.env.STRIPE_ENTERPRISE_PRICE_ID_MONTHLY ?? "";
export const STRIPE_ENTERPRISE_PRICE_ANNUAL  = process.env.STRIPE_ENTERPRISE_PRICE_ID_ANNUAL  ?? "";
