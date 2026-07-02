# LearnFast Enterprise v1 — Build Backlog

> Phases worked in strict order. A phase is complete only when its acceptance tests pass AND consumer-product regression checks pass (signup, /try, recording upload, analysis, Pro checkout). All enterprise paths are behind `isEnterpriseEnabled()` until Phase 6 GA.

---

## PHASE 0 — Foundations (no UI)

- [x] **P0-1** `types/enterprise.ts` — TypeScript interfaces for all org Firestore doc shapes (`Organization`, `OrgMember`, `OrgInvite`, `OrgTeam`, `OrgSession`, `OrgAnalyticsPeriod`)
- [x] **P0-2** `lib/feature-flags.ts` — `isEnterpriseEnabled()` env-based flag; extendable per org in later phases
- [x] **P0-3** `lib/org-context.ts` — `getOrgContext(uid)` server-side helper (3-read: presenter doc → member doc → org doc); `hasOrgPermission(role, minRole)` utility
- [x] **P0-4** `firestore.rules` — org collections (`organizations/{orgId}/**`) with role-based read/write; validated `feedback_responses` create (nested scores 1–10, comment ≤ 500 chars)
- [x] **P0-5** Firebase emulator config — `firebase.json` emulators block (Firestore port 8080, Auth port 9099); `.firebaserc` with project ID
- [x] **P0-6** `scripts/test-rules.mjs` — Node native test runner + `@firebase/rules-unit-testing` v3; covers all Phase 0 acceptance criteria
- [x] **P0-7** `package.json` — `@firebase/rules-unit-testing` dev dep; `test:rules` script

**Phase 0 acceptance:**
- [ ] `npm run test:rules` green: non-members cannot read org data; members cannot write settings; unauth feedback create validates and rejects malformed payloads

---

## PHASE 1 — Org creation & membership

- [ ] **P1-1** `app/org/create/page.tsx` — "Create your organisation" form (org name, optional logo, seat count picker min 5); creates org in `trialing` status (14-day, no Stripe yet); writes `organizations/{orgId}` + `organizations/{orgId}/members/{uid}` (role: owner)
- [ ] **P1-2** `app/api/org/create/route.ts` — server-side org create: generate slug, validate seat min (5), set `plan: 'enterprise'`, `subscriptionStatus: 'trialing'`, `trialEndsAt: now+14d`; write to Firestore via admin SDK; update caller's presenter doc with `orgId`/`orgRole`
- [ ] **P1-3** `app/api/org/[orgId]/invite/route.ts` — POST: validate caller is owner/admin, seat capacity check, generate 32-char token, write invite doc, send invite email (Nodemailer); GET: list pending invites
- [ ] **P1-4** `app/org/join/[token]/page.tsx` — invite accept page: validate token (exists, not expired/revoked, org still has capacity); if user authed → create member doc + consume seat + mark invite accepted; if not authed → store token in session, redirect to signup/login, complete on return. Edge cases: already-in-org block with explanation; expired/revoked banner
- [ ] **P1-5** `app/api/org/[orgId]/join/route.ts` — POST: accept invite logic (atomic transaction: verify token, create member doc, increment `seats.used`, mark invite accepted, update presenter's `orgId`/`orgRole`)
- [ ] **P1-6** `app/(org)/[orgId]/members/page.tsx` — member list table (name, role, last active, sessions count, archetype); inline role change; remove button. Owner-only: transfer ownership. Seat count chip (used/purchased)
- [ ] **P1-7** `app/api/org/[orgId]/members/[userId]/route.ts` — DELETE: remove member (atomic: decrement `seats.used`, remove member doc, strip `orgId`/`orgRole` from presenter doc); PATCH: update role
- [ ] **P1-8** Domain auto-join — on signup, if `allowedEmailDomains` contains the new user's email domain, auto-create member doc (role: member) and consume a seat. Hook into existing auth flow or `app/api/auth/signup` equivalent
- [ ] **P1-9** `lib/email.ts` additions (or Resend integration if Nodemailer not prod-ready) — `sendOrgInviteEmail(to, orgName, acceptUrl, expiresAt)` template

**Phase 1 acceptance:**
- Full invite lifecycle: send → receive email → click link → accept (authed + unauthed paths) → membership doc created → seat consumed
- Expired/revoked invite shows correct error
- Already-in-another-org: blocked with explanation
- Removing a member: seat freed; their personal sessions/data untouched; org loses aggregate inclusion going forward

---

## PHASE 2 — Billing

- [ ] **P2-1** Stripe products/prices — `STRIPE_ENTERPRISE_PRICE_ID_MONTHLY` + `STRIPE_ENTERPRISE_PRICE_ID_ANNUAL` env vars; document in `apphosting.yaml` (secrets, not values)
- [ ] **P2-2** `app/api/stripe/enterprise-checkout/route.ts` — Stripe Checkout session (subscription mode, `quantity = seats`, `subscription_data.metadata.orgId`); org must be in `trialing` or `active`
- [ ] **P2-3** Webhook additions to `app/api/stripe/webhook/route.ts` — handle `checkout.session.completed` (activate org, set `seats.purchased`, `stripeCustomerId`, `stripeSubscriptionId`); `customer.subscription.updated` (sync status + quantity); `customer.subscription.deleted` (org → `cancelled`, read-only grace); `invoice.payment_failed` (→ `past_due`, 14-day grace); `invoice.paid` (clear grace). All idempotent via `billingEvents/{eventId}` log
- [ ] **P2-4** `app/(org)/[orgId]/billing/page.tsx` — plan info, seat controls (add/remove with proration preview via Stripe `upcoming invoice` API), Stripe Customer Portal link for payment method + invoices, cancellation flow
- [ ] **P2-5** `app/api/org/[orgId]/billing/seats/route.ts` — PATCH: update Stripe subscription quantity; validate new quantity ≥ `seats.used`; preview proration; commit update
- [ ] **P2-6** Team→Enterprise upgrade — detect existing Team subscription in `checkout.session.completed`; create org, migrate Team members into `organizations/{orgId}/members`, swap Stripe price + quantity with proration
- [ ] **P2-7** Past-due UI — admin banner on all org pages when `subscriptionStatus === 'past_due'`; read-only lock after grace period

**Phase 2 acceptance:**
End-to-end in Stripe test mode: buy 5 seats → add 3 (proration previewed) → remove 2 (blocked below `seats.used`) → simulate payment failure → 14-day grace → recover. All webhook events idempotent on replay.

---

## PHASE 3 — Frictionless feedback + scheduling

- [ ] **P3-1** `app/(org)/[orgId]/sessions/new/page.tsx` — session create form (title, type, presenter, scheduled start/end, timezone, optional attendee email list); generates `feedbackCode` (6-char); writes `organizations/{orgId}/sessions/{sessionId}`
- [ ] **P3-2** `app/api/org/[orgId]/sessions/route.ts` — POST: create session doc, generate feedbackCode (collision-check), set `status: 'scheduled'`; GET: list org sessions
- [ ] **P3-3** Calendar attachments — `.ics` file generation (embed feedback URL + QR in description); "Add to Google Calendar" + "Add to Outlook" URL-template links (no OAuth). Embed in session confirmation email
- [ ] **P3-4** Confirmation email — to presenter + optional pasted attendee list; contains feedback URL, QR image, calendar links. Use `sendOrgSessionEmail()` helper
- [ ] **P3-5** `app/f/[code]/page.tsx` — public feedback form (zero auth): mobile-first, five 1–10 sliders (Clarity, Energy, Engagement, Understanding, Connection) + optional comment + optional name. Server Action submits to Firestore via admin SDK (session status validation, fingerprint rate-limit ≤3/session). Thank-you screen with `/try?ref=feedback` growth link
- [ ] **P3-6** `app/f/[code]/page.tsx` — live response counter: presenter opens their session view; Firestore listener on `feedback_responses` where `sessionId == session.id`; count ticks up in real time
- [ ] **P3-7** QR generation — `qrcode.react` (already installed) renders QR for `learnfastapp.com/f/{code}` on session detail page + downloadable PNG
- [ ] **P3-8** Post-session aggregation — Cloud Function (or API cron) triggered on session `status → 'completed'`: aggregate feedback_responses into Audience signal on presenter's linked recording/analysis, same pipeline as existing live-audience feedback. Link via `linkedRecordingId` on session doc
- [ ] **P3-9** Session status lifecycle — `app/api/org/[orgId]/sessions/[sessionId]/route.ts`: PATCH to transition `scheduled → live → completed | cancelled`; auto-transition cron (scheduled → live at scheduledStart, live → completed at scheduledEnd + 60 min)
- [ ] **P3-10** Update `feedbackResponses` rules — add session status window check (Phase 0 added field validation; Phase 3 adds: `get(org session doc).data.status in ['live', 'scheduled']` guard)

**Phase 3 acceptance:**
Phone scan → submitted feedback in < 20 seconds with zero account; 50 concurrent simulated submissions succeed; aggregated audience scores appear in presenter's existing analysis view; form rejects submissions outside session window; `/try?ref=feedback` UTM tracked.

---

## PHASE 4 — Admin dashboard & analytics

- [ ] **P4-1** `functions/aggregateOrgAnalytics.ts` — scheduled Cloud Function: nightly aggregate per org into `organizations/{orgId}/analytics/{YYYY-MM}` docs (member count, sessions count, feedback count, dimension averages); also triggered on session completion for same-day accuracy
- [ ] **P4-2** `app/(org)/[orgId]/dashboard/page.tsx` — Overview: seats chip, active members this month, sessions run, feedback responses, org-average 5-dim radar (Recharts, reuse existing), trend sparklines
- [ ] **P4-3** `app/(org)/[orgId]/people/page.tsx` — member list with last active, archetype, dimension averages; invite management (send/resend/revoke); remove member CTA
- [ ] **P4-4** `app/(org)/[orgId]/sessions/page.tsx` — upcoming + past sessions table; response counts; link to session detail; status badges
- [ ] **P4-5** `app/(org)/[orgId]/leaderboard/page.tsx` — most-improved + most-active; improvement-framed (effort + progress rank, not raw score). Admin toggle: on/off per org setting
- [ ] **P4-6** `app/(org)/[orgId]/settings/page.tsx` — branding (logo upload + 3 hex pickers), privacy toggles (`managerCanViewIndividualSessions`, `feedbackAnonymousDefault`), allowed email domains, leaderboard toggle
- [ ] **P4-7** Privacy gate — `managerCanViewIndividualSessions` check in `app/api/org/[orgId]/members/[userId]/sessions/route.ts`; direct-URL attempts also blocked server-side and in rules
- [ ] **P4-8** `app/(org)/[orgId]/billing/page.tsx` — (from Phase 2, flesh out with invoice history from Stripe Portal link)

**Phase 4 acceptance:**
Dashboard loads < 2 s for org with 50 members / 500 sessions (seeded test data). Privacy toggle verifiably gates individual-session access including direct-URL attempts.

---

## PHASE 5 — Rehearsals, coaching & community scoping

- [ ] **P5-1** Coach-assigned rehearsal tasks — `organizations/{orgId}/tasks/{taskId}` doc (assignees[], promptId, dueAt, assignedBy); task list visible to assignees in existing rehearsal UI; completion triggers aggregate score visible to coach
- [ ] **P5-2** `app/(org)/[orgId]/coaching/page.tsx` — coach view: pending tasks, completion rates, member scores for each task
- [ ] **P5-3** Org community space — filter existing `feed` data model by `orgId` field; org members see org feed (scoped to `orgId`) plus global feed (toggled by org setting `defaultFeedScope: 'org' | 'global'`); posts from non-members not visible in org feed
- [ ] **P5-4** Regression check — coaching outputs (AI coaching feed, session summaries) unaffected by org context; run existing consumer flows through staging

**Phase 5 acceptance:**
Assignment lifecycle (create → notify → complete → coach view) works end to end. Org posts invisible to non-members. Consumer community unaffected.

---

## PHASE 6 — Polish, hardening, launch readiness

- [ ] **P6-1** Org onboarding checklist — persistent banner on `/(org)/[orgId]/dashboard` until: invite team ✓, branding set ✓, first session scheduled ✓, first feedback collected ✓
- [ ] **P6-2** Empty states + error states on all admin pages (no members yet, no sessions yet, no data yet)
- [ ] **P6-3** Mobile pass — all org admin pages responsive; test on 390px viewport
- [ ] **P6-4** `/enterprise` marketing page — pricing grid, feature comparison vs Yoodli/Orai "call sales" positioning, self-serve CTA. **Copy flagged for Ollie review before publish** — do not auto-deploy
- [ ] **P6-5** Load + regression suite — seeded 50-member org; confirm < 2 s dashboard; confirm consumer /try, signup, Pro checkout unaffected
- [ ] **P6-6** Remove `ENTERPRISE_ENABLED` feature flag gate for general availability — **only on Ollie's explicit go-ahead**
- [ ] **P6-7** Update privacy policy draft list — document feedback respondent data retention (raw responses retained while org active), fingerprint hashing, GDPR data-subject rights

**Phase 6 acceptance:**
Cold user: /enterprise → paid org → invited teammate → scheduled session → QR feedback collected → dashboard insight. No founder intervention.

---

## V2 ENTERPRISE (deferred — do not build)

- SAML SSO + self-serve IdP config (evaluate WorkOS/Clerk/Scalekit buy-vs-build when needed)
- SCIM provisioning
- Google/Microsoft OAuth calendar sync (auto-create events, pull attendee lists)
- LMS/SCORM + HRIS integrations
- Audit-log export
- Custom rubrics per org (customer's scoring dimensions layered over the five)
- Per-org data-retention controls
- Multi-org membership
- Invoiced/PO billing
- SOC 2 readiness
- Slack/Teams notification integrations
- API access for enterprise customers
