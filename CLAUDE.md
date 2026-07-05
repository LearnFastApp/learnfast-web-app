@AGENTS.md

---

## Standing Conventions — Data Foundation

These rules apply to all code in this repo. They are enforced by convention, not by lint.

### 1. All analytical writes go through `lib/telemetry.ts`
Never write ad-hoc events to the `events` collection anywhere in the codebase.
Import `logEvent` from `@/lib/telemetry` and use it exclusively.

### 2. Scoring version bump required before deploying prompt changes
Any change to the scoring prompt (in `lib/ai-assessment-analysis.ts` or
`lib/rehearsal-coaching.ts`), model (`lib/ai-model.ts`), or rubric REQUIRES:
1. Increment `ACTIVE_SCORING_VERSION` in `lib/scoring-version.ts`
2. Run `node scripts/seed-scoring-version.mjs` to register the new version in Firestore
3. Deploy — only then

Failure to do this corrupts longitudinal score comparisons.

### 3. New features must ship with their event taxonomy defined
PR description must list every new `logEvent()` call and its type string.
Event types follow `domain.action` namespacing (e.g. `funnel.try_started`).

### 4. `events`, `measurements`, `interventions` are append-only
No updates, no deletes. The ONLY exception is the GDPR erasure script
(`scripts/gdpr-erase-user.mjs`), which follows a documented procedure.

### 5. PII lives in `presenters` and nowhere else in the analytical layer
`events`, `measurements`, and `interventions` must never contain email addresses,
display names, auth UIDs, or any other directly identifying fields.
Use `user_key` (from `lib/user-key.ts`) exclusively.
