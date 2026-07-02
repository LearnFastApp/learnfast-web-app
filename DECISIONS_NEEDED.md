# Decisions Needed — LearnFast Enterprise v1

> Claude Code will not resolve these autonomously. Each item blocks a specific phase.

---

## D1 — Pricing ✅ DECIDED

- £15/seat/month, 5-seat minimum enforced at checkout
- Annual: £12/seat/month equivalent
- Enterprise replaces the Team tier (Team tier retired)
- Self-serve up to 50 seats; above 50 → "Contact us" (no self-serve checkout)

---

## D2 — Trial terms ✅ DECIDED

- 14-day free trial
- Card collected upfront at org creation (Phase 2 Stripe checkout wires this in)
- Trial ends → org becomes read-only until payment confirmed

---

## D3 — Leaderboard ✅ DECIDED

- Off by default (admin opt-in)
- Admins can also create custom leaderboards (Phase 4 P4-5 extended scope)

---

## D4 — Email provider ✅ DECIDED

- Nodemailer + Gmail SMTP confirmed for now (`GMAIL_USER` / `GMAIL_APP_PASSWORD`)
- Monitor deliverability; migrate to Resend if invite emails hit spam or rate limits
- Phase 1 reuses `lib/email.ts` directly

---

## D5 — Manager visibility ✅ DECIDED

- `managerCanViewIndividualSessions: false` default (aggregates-only)
- Owner AND admin can toggle this setting (not owner-only)

---

## D6 — /enterprise page copy (blocks Phase 6 P6-4)

Review and approve draft copy before Claude Code publishes the marketing page.

**Status:** OPEN — review at Phase 6

---

## D7 — Stripe live-mode activation (blocks Phase 2)

Confirm when to rotate `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in Firebase Secret Manager to live-mode values. Also confirm Stripe Webhook endpoint registered in live Dashboard.

**Status:** OPEN — action when ready to go live
