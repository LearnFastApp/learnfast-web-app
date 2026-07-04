# Context Engine — Developer Guide

## What it does

The Context Engine adds a context selector to the assessment flow. The selected context changes how the AI interprets and weights the five scoring dimensions — but never the dimensions themselves. Same recording, different lens, more truthful feedback.

## How to add a new context

1. Open `lib/contexts/registry.ts`.
2. Add a new entry to `CONTEXT_REGISTRY` following the `AssessmentContext` interface.
3. Set a unique `contextId` (stable slug — never change this after launch).
4. Set `enabled: true` and a `sortOrder` to position it in the dropdown.
5. Set `promptVersion: "1.0.0"`.
6. Write all five `dimensionWeights` (`low | standard | high | critical`) and `dimensionReinterpretations` (≤30 words each).
7. Deploy. The dropdown updates automatically.

```ts
{
  contextId: "sales_demo",
  label: "Sales Demo",
  description: "Convert a prospect through a live product walkthrough.",
  successDefinition: "Move a qualified prospect to the next stage by connecting product capability to their specific pain, handling objections, and creating urgency.",
  dimensionWeights: {
    clarity: "critical", energy: "high", engagement: "critical",
    understanding: "high", connection: "critical",
  },
  dimensionReinterpretations: {
    clarity: "...",
    energy: "...",
    engagement: "...",
    understanding: "...",
    connection: "...",
  },
  promptVersion: "1.0.0",
  enabled: true,
  sortOrder: 7,
}
```

## How to bump a promptVersion

Bump `promptVersion` whenever you change `successDefinition`, `dimensionWeights`, or `dimensionReinterpretations` for an existing context. Use semver (`"1.0.0"` → `"1.1.0"`).

The `promptVersion` is stored on every score document at write time. This lets you:
- Identify which assessment results were generated under which prompt.
- Detect drift: if scores change after a prompt bump, the version field tells you why.
- Filter analytics to compare like-with-like.

## How the kill-switch works

Set `enabled: false` on any context in `CONTEXT_REGISTRY`. It immediately disappears from all dropdowns without requiring a deploy rebuild.

Historical sessions that used a disabled context are unaffected — `contextLabelAtTime` is denormalised on the document at write time and never read from the registry at display time.

## Feature flag

The context UI (dropdowns) is gated behind `NEXT_PUBLIC_FEATURE_CONTEXTS=true` in `apphosting.yaml`. When the flag is off:
- No dropdown is shown anywhere.
- All assessments use `contextId: "general"` silently.
- All existing analytics, archetypes, and score history are unaffected.

Set it to `true` in `apphosting.yaml` to enable for all users.

## Architecture summary

```
lib/contexts/
  registry.ts   — single source of truth for all contexts (typed TS constant)
  prompts.ts    — buildContextPromptBlock(context) → prompt injection string
  analytics.ts  — trackContextSelected / trackAssessmentCompleted (gtag events)
```

**Scoring pipeline flow:**
1. User selects context in UI → `contextId` sent in FormData/JSON body.
2. API route resolves context via `getContext(contextId)` → stores `contextId`, `contextLabelAtTime`, `contextPromptVersion` on the session/assessment doc.
3. When scoring fires, `contextId` is read from the stored doc → `buildContextPromptBlock` injects the context block into the Claude prompt.
4. Claude scores with context awareness. JSON output schema is unchanged.

## V2 notes (out of scope for V1)

- Enterprise org-level default contexts (admin sets a default for the whole org).
- Custom user-defined contexts.
- Admin UI for editing context definitions without redeploy (Firestore copy already seeded for this).
- Per-context archetype variants.
