# Decisions Needed — LearnFast Enterprise v1

> Claude Code will not resolve these autonomously. Each item blocks a specific phase.
> Mark each as DECIDED and add your answer when resolved.

---

## D1 — Pricing (blocks Phase 2)

**Proposed:** £15/seat/month, 5-seat minimum. Annual: £12/seat/month equivalent.

Questions:
- Confirm or adjust per-seat price and annual rate?
- Does the Team tier (~£49/month) remain, or does Enterprise replace it at its floor?
- Should the 5-seat minimum be enforced at checkout, or advisory only?

**Status:** OPEN

---

## D2 — Trial terms (blocks Phase 1 / Phase 2)

**Proposed:** 14-day free trial, seat cap honoured (no billing), org created in `trialing` status. Trial ends → must convert or org becomes read-only.

Questions:
- Confirm 14-day length?
- Card-upfront at trial start, or card collected at conversion only?

**Status:** OPEN

---

## D3 — Leaderboard default (blocks Phase 4 P4-5)

**Proposed:** Admin opt-in (off by default). Rationale: psychological-safety positioning — improvement-framed leaderboards are a trust differentiator, and defaulting them off lets admins roll out intentionally.

Questions:
- Confirm opt-in default, or prefer opt-out (on by default, admin can disable)?

**Status:** OPEN

---

## D4 — Email provider (blocks Phase 1 P1-3 / P1-9)

`lib/email.ts` is fully implemented with Nodemailer + Gmail SMTP (`GMAIL_USER` + `GMAIL_APP_PASSWORD` env vars). The existing system sends session summary emails and AI result emails via this path.

Questions:
- Is Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD`) confirmed working in production for outbound email?
- Gmail SMTP has a 2,000-recipient/day limit and can be flagged as spam for transactional mail — is this acceptable for enterprise invite emails, or should we move to Resend/SendGrid for transactional reliability?

If Nodemailer + Gmail is confirmed production-ready, Phase 1 can reuse `lib/email.ts` directly. If not, Claude Code will add Resend as an alternative transport (simple API key, no SMTP) on your instruction.

**Status:** OPEN

---

## D5 — Manager visibility default (blocks Phase 4 P4-7)

**Proposed:** `managerCanViewIndividualSessions: false` (aggregates-only default). Positioned as a trust differentiator vs competitors.

Questions:
- Confirm aggregates-only default?
- Should "manager can view individual sessions" ever be an owner-level toggle only, or can admins also flip it?

**Status:** OPEN

---

## D6 — /enterprise page copy (blocks Phase 6 P6-4)

The marketing page copy and competitive comparison claims (vs Yoodli, Orai) require review before publish.

Action needed: Review the draft copy when Phase 6 P6-4 is built and explicitly approve before the page goes live.

**Status:** OPEN

---

## D7 — Stripe live-mode activation (blocks Phase 2)

Claude Code will never enable Stripe live mode autonomously. Before switching from test-mode to live-mode Stripe keys:

Action needed: Confirm when to rotate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Firebase Secret Manager to live-mode values. Also confirm Stripe Webhook endpoint registered in live Dashboard for `learnfastapp.com/api/stripe/webhook`.

**Status:** OPEN
