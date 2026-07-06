/**
 * Provisions a no-charge enterprise pilot for an existing LearnFast user.
 *
 * The target user must already have signed up at learnfastapp.com.
 * No Stripe subscription is created — the pilot is entirely free until
 * the trial expires. At expiry the owner lands on /[orgId]/billing and
 * can subscribe with whatever seat count they actually need.
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
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

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

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const { email, orgName, seats, trialDays } = parseArgs();

  // Validate args
  const errors = [];
  if (!email || !email.includes("@"))     errors.push("--email is required (e.g. pilot@company.com)");
  if (!orgName || orgName.trim().length < 2) errors.push("--org is required (e.g. \"Acme Corp\")");
  if (!seats || isNaN(seats) || seats < 1 || seats > 200) errors.push("--seats must be a number between 1 and 200");
  if (!trialDays || isNaN(trialDays) || trialDays < 1 || trialDays > 365) errors.push("--trial-days must be a number between 1 and 365");
  if (errors.length) {
    console.error("\n❌  Invalid arguments:\n");
    errors.forEach((e) => console.error("   •", e));
    console.error("\nExample:");
    console.error('   node scripts/provision-pilot.mjs --email pilot@company.com --org "Acme Corp" --seats 5 --trial-days 30\n');
    process.exit(1);
  }

  initializeApp({ projectId: "learnfast-web-app" });
  const auth = getAuth();
  const db = getFirestore();

  // 1. Look up the user in Firebase Auth
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
  } catch {
    console.error(`\n❌  No Firebase Auth user found for ${email}`);
    console.error("    The pilot customer must sign up at learnfastapp.com first.\n");
    process.exit(1);
  }

  const uid = authUser.uid;
  console.log(`\n✓  Firebase Auth user found: ${uid}`);

  // 2. Check presenter doc exists
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  if (!presenterSnap.exists) {
    console.error(`\n❌  No presenter doc found for ${email} (uid: ${uid})`);
    console.error("    The user must have completed sign-up at learnfastapp.com.\n");
    process.exit(1);
  }

  const presenterData = presenterSnap.data();

  // 3. Guard: already in an org
  if (presenterData.orgId) {
    console.error(`\n❌  ${email} is already a member of org: ${presenterData.orgId}`);
    console.error("    Remove them from that org first, or use a different account.\n");
    process.exit(1);
  }

  const presenterEmail   = presenterData.email   ?? email;
  const presenterName    = presenterData.displayName ?? email.split("@")[0];

  // 4. Create the org
  const slug       = await uniqueSlug(db, slugify(orgName.trim()));
  const now        = Timestamp.now();
  const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000));

  const orgRef = db.collection("organizations").doc();
  const orgId  = orgRef.id;

  const orgData = {
    name:               orgName.trim(),
    slug,
    logoUrl:            null,
    createdAt:          now,
    createdBy:          uid,
    plan:               "enterprise",
    subscriptionStatus: "trialing",
    trialEndsAt,
    isPilot:            true,          // marks this as a provisioned pilot (not self-serve)
    seats: { purchased: seats, used: 1 },
    stripeCustomerId:      null,        // deliberately absent — no charge possible
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

  const memberData = {
    role:        "owner",
    email:       presenterEmail,
    displayName: presenterName,
    joinedAt:    now,
    invitedBy:   null,
    status:      "active",
  };

  // 5. Atomic write: org + member + presenter update
  const batch = db.batch();
  batch.set(orgRef, orgData);
  batch.set(db.doc(`organizations/${orgId}/members/${uid}`), memberData);
  batch.update(db.doc(`presenters/${uid}`), {
    orgId,
    orgRole:   "owner",
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  // ── Summary ──────────────────────────────────────────────────────────────

  const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  console.log(`
✅  Pilot org created!

   Org ID      : ${orgId}
   Org name    : ${orgName.trim()}
   Slug        : ${slug}
   Owner       : ${presenterEmail} (${uid})
   Seats       : ${seats}
   Trial ends  : ${trialEndDate} (${trialDays} days)
   Stripe      : none — client will not be charged during trial

   Dashboard   : https://learnfastapp.com/${orgId}/dashboard
   Billing     : https://learnfastapp.com/${orgId}/billing

   Share the dashboard link with your pilot customer.
   When the trial expires they will be prompted to subscribe
   and can choose their own seat count at that point.
`);
}

run().catch((err) => {
  console.error("\n❌  Unexpected error:", err.message ?? err);
  process.exit(1);
});
