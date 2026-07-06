/**
 * Provisions a no-charge enterprise pilot for a future LearnFast customer.
 *
 * The customer does NOT need an account before you run this — just their email.
 * The script creates the org and generates a one-click invite link. Share the
 * invite URL and the customer will create their account (or sign in) and join
 * as Owner in one step.
 *
 * No Stripe subscription is created — the pilot is entirely free until the
 * trial expires. At expiry the Owner lands on /[orgId]/billing and can subscribe
 * with whatever seat count they actually need.
 *
 * Usage:
 *   node scripts/provision-pilot.mjs \
 *     --email pilot@company.com \
 *     --org "Acme Corp" \
 *     --seats 5 \
 *     --trial-days 30
 *
 * All four flags are required. Seats must be between 1 and 200.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ── Args ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    email:      get("--email"),
    orgName:    get("--org"),
    seats:      get("--seats")      ? parseInt(get("--seats"), 10)      : null,
    trialDays:  get("--trial-days") ? parseInt(get("--trial-days"), 10) : null,
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

async function uniqueSlug(db, base) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`;
    const snap = await db.collection("organizations").where("slug", "==", candidate).limit(1).get();
    if (snap.empty) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const { email, orgName, seats, trialDays } = parseArgs();

  // Validate args
  const errors = [];
  if (!email || !email.includes("@"))                              errors.push("--email is required (e.g. pilot@company.com)");
  if (!orgName || orgName.trim().length < 2)                      errors.push("--org is required (e.g. \"Acme Corp\")");
  if (!seats || isNaN(seats) || seats < 1 || seats > 200)         errors.push("--seats must be a number between 1 and 200");
  if (!trialDays || isNaN(trialDays) || trialDays < 1 || trialDays > 365) errors.push("--trial-days must be a number between 1 and 365");
  if (errors.length) {
    console.error("\n❌  Invalid arguments:\n");
    errors.forEach((e) => console.error("   •", e));
    console.error("\nExample:");
    console.error('   node scripts/provision-pilot.mjs --email pilot@company.com --org "Acme Corp" --seats 5 --trial-days 30\n');
    process.exit(1);
  }

  initializeApp({ projectId: "learnfast-app-cc98c" });
  const db = getFirestore();

  // Create org
  const slug        = await uniqueSlug(db, slugify(orgName.trim()));
  const now         = Timestamp.now();
  const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000));

  const orgRef = db.collection("organizations").doc();
  const orgId  = orgRef.id;

  const orgData = {
    name:               orgName.trim(),
    slug,
    logoUrl:            null,
    createdAt:          now,
    createdBy:          null,   // no uid yet — customer hasn't signed up
    plan:               "enterprise",
    subscriptionStatus: "trialing",
    trialEndsAt,
    isPilot:            true,   // marks this as a provisioned pilot (not self-serve)
    seats: { purchased: seats, used: 0 }, // 0 until owner accepts invite
    stripeCustomerId:      null,           // deliberately absent — no charge possible
    stripeSubscriptionId:  null,
    settings: {
      managerCanViewIndividualSessions: false,
      defaultSessionVisibility:         "private",
      allowedEmailDomains:              [],
      feedbackAnonymousDefault:         true,
      leaderboardEnabled:               false,
      defaultFeedScope:                 "org",
    },
  };

  // Create invite token (same shape as /api/org/[orgId]/invite so the
  // existing /org/join/[token] page and /api/org/[orgId]/join route work as-is)
  const token     = generateToken();
  const inviteRef = db.collection(`organizations/${orgId}/invites`).doc();

  const inviteData = {
    email:     email.trim().toLowerCase(),
    role:      "owner",
    token,
    createdAt: now,
    expiresAt: trialEndsAt, // invite stays valid for the full trial period
    status:    "pending",
    createdBy: null,
  };

  const tokenData = {
    orgId,
    inviteId:  inviteRef.id,
    email:     email.trim().toLowerCase(),
    role:      "owner",
    expiresAt: trialEndsAt,
    status:    "pending",
  };

  // Atomic write: org + invite sub-doc + top-level token lookup doc
  const batch = db.batch();
  batch.set(orgRef, orgData);
  batch.set(inviteRef, inviteData);
  batch.set(db.doc(`org_invite_tokens/${token}`), tokenData);
  await batch.commit();

  // ── Summary ──────────────────────────────────────────────────────────────

  const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const appUrl = "https://learnfastapp.com";

  console.log(`
✅  Pilot org created!

   Org ID       : ${orgId}
   Org name     : ${orgName.trim()}
   Slug         : ${slug}
   Invited      : ${email.trim().toLowerCase()} (as Owner)
   Seats        : ${seats}
   Trial ends   : ${trialEndDate} (${trialDays} days)
   Stripe       : none — client will not be charged during trial

   ✉️  Send this link to your pilot customer:
   Invite URL   : ${appUrl}/org/join/${token}

   The invite is valid until ${trialEndDate}.
   The customer does NOT need an account before clicking it —
   they can sign up and join in one step.

   (Dashboard: ${appUrl}/${orgId}/dashboard)
   (Billing:   ${appUrl}/${orgId}/billing)
`);
}

run().catch((err) => {
  console.error("\n❌  Unexpected error:", err.message ?? err);
  process.exit(1);
});
