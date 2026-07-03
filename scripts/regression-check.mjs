/**
 * LearnFast regression smoke test.
 *
 * Verifies that the consumer product and key enterprise endpoints return
 * expected HTTP status codes. Does NOT test business logic — that's covered
 * by firestore rules unit tests (scripts/test-rules.mjs).
 *
 * Usage:
 *   BASE_URL=https://www.learnfastapp.com node scripts/regression-check.mjs
 *   BASE_URL=http://localhost:3000 node scripts/regression-check.mjs
 *
 * Exit 0 = all checks passed. Exit 1 = one or more failures.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

async function check(label, url, expectedStatus, opts = {}) {
  try {
    const res = await fetch(`${BASE}${url}`, opts);
    if (res.status === expectedStatus) {
      console.log(`✅  ${label} → ${res.status}`);
      passed++;
    } else {
      console.error(`❌  ${label} → expected ${expectedStatus}, got ${res.status} (${url})`);
      failed++;
    }
  } catch (err) {
    console.error(`❌  ${label} → NETWORK ERROR: ${err.message} (${url})`);
    failed++;
  }
}

async function run() {
  console.log(`\nLearnFast regression check — ${BASE}\n${"─".repeat(60)}`);

  // ── Consumer product — public pages ────────────────────────────────────────
  console.log("\n[Consumer — public pages]");
  await check("Homepage",          "/",                200);
  await check("/try funnel",       "/try",             200);
  await check("/pricing",          "/pricing",         200);
  await check("/join (code entry)","/join",            200);
  await check("/enterprise page",  "/enterprise",      200);
  await check("Privacy policy",    "/privacy",         200);
  await check("Terms",             "/terms",           200);

  // ── Consumer product — protected pages (expect redirect = 200 in Next.js) ─
  console.log("\n[Consumer — auth-protected pages redirect to login]");
  await check("Dashboard (no auth)", "/dashboard",     200); // Next.js page, auth handled client-side

  // ── Feedback form ──────────────────────────────────────────────────────────
  console.log("\n[Feedback form]");
  await check("/f/{bogus code}",  "/f/XXXXXX",        200); // page renders; 404 state handled client-side
  await check("Session code page", "/session/XXXXXX", 200); // same

  // ── API: unauthenticated → 401 ─────────────────────────────────────────────
  console.log("\n[API — unauthenticated → 401]");
  const json = { headers: { "Content-Type": "application/json" } };
  await check("GET /api/rehearsal (no auth)",          "/api/rehearsal",             401, json);
  await check("GET /api/org/fake/sessions (no auth)",  "/api/org/fake/sessions",     401, json);
  await check("GET /api/org/fake/analytics (no auth)", "/api/org/fake/analytics",    401, json);
  await check("GET /api/org/fake/my-sessions (no auth)","/api/org/fake/my-sessions", 401, json);
  await check("GET /api/org/fake/assignments (no auth)","/api/org/fake/assignments",401, json);
  await check("GET /api/org/fake/feed (no auth)",      "/api/org/fake/feed",         401, json);
  await check("GET /api/org/fake/onboarding (no auth)","/api/org/fake/onboarding",  401, json);
  await check("GET /api/org/fake/members-list (no auth)","/api/org/fake/members-list",401, json);
  await check("GET /api/feed (no auth — public)",      "/api/feed",                  200, json); // public

  // ── API: feedback POST validation ──────────────────────────────────────────
  console.log("\n[API — feedback validation]");
  await check(
    "POST /api/feedback missing sessionId → 400",
    "/api/feedback",
    400,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores: { clarity: 50, energy: 50, engagement: 50, understanding: 50, connection: 50 } }) }
  );
  await check(
    "POST /api/feedback invalid scores → 400",
    "/api/feedback",
    400,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "fake", scores: { clarity: 200 } }) }
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Regression check crashed:", err);
  process.exit(1);
});
