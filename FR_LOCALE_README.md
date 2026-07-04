# Locale System — Developer Guide

How to add a new locale, edit culture profiles, and manage translation reviews.

---

## Architecture overview

```
locales/
  types.ts          ← LocaleCatalogue type (all namespaces)
  en.ts             ← English strings
  fr.ts             ← French strings
  index.ts          ← getCatalogue(locale) factory

lib/
  i18n/
    index.tsx       ← LocaleProvider, useLocale(), useSetLocale(), useTranslations()
  ai-locale-block.ts     ← buildLocaleBlock() — injects culture guidance into AI prompts
  contexts/
    registry.ts     ← AssessmentContext i18n (per-locale labels + descriptions)
    analytics.ts    ← trackContextSelected(), trackAssessmentCompleted()
  locale/
    analytics.ts    ← trackLocaleSet()
```

### Where locale is stored

| Layer | Storage | How it's set |
|-------|---------|-------------|
| Browser session | `LocaleProvider` React context (reads Firestore on mount) | Automatically |
| User profile | `presenters/{uid}.locale` in Firestore | `useSetLocale()` hook |
| Org default | `organizations/{orgId}.defaultLocale` in Firestore | Org admin via settings page |
| AI assessments | `ai_assessments/{id}.userLocale` | Copied from presenter profile at submission time |

---

## Adding a new locale (e.g. `de` for German)

### 1. Add to `locales/types.ts`

```ts
export type SupportedLocale = "en" | "fr" | "de";
```

### 2. Create `locales/de.ts`

Copy `locales/fr.ts` as a starting point. Translate every string. The type system will catch missing keys.

### 3. Register in `locales/index.ts`

```ts
import de from "./de";

export function getCatalogue(locale: string): LocaleCatalogue {
  if (locale === "fr") return fr;
  if (locale === "de") return de;
  return en;
}
```

### 4. Add culture profile in `lib/ai-locale-block.ts`

Add a `LocaleCultureProfile` entry for `"de"` following the same pattern as `"fr"`. Key sections:
- `communicationStyle` — formal vs. casual norms
- `feedbackStyle` — how criticism is typically delivered
- `positiveMarkers` — culturally specific phrases to watch for
- `structurePreference` — how speeches are typically structured

### 5. Add i18n entries to context registry

In `lib/contexts/registry.ts`, add `i18n.de` entries to each `AssessmentContext` in the `CONTEXTS` array.

### 6. Update API validation

In `app/api/org/[orgId]/info/route.ts`, add `"de"` to the locale validation:

```ts
if (dl !== "en" && dl !== "fr" && dl !== "de") { ... }
```

### 7. Add email subject translations

In `lib/email.ts`, update subject line functions that branch on locale to handle `"de"`.

### 8. Update AssemblyAI language code mapping (if needed)

`lib/assemblyai-client.ts` — if German uses a different filler word set, add `DE_FILLERS` and update `countFillerWords`.

---

## Editing a culture profile

File: `lib/ai-locale-block.ts`

`buildLocaleBlock(locale, contextId?)` is injected into every AI assessment prompt. Edit this to tune how Claude generates FR (or other locale) feedback.

Key fields to tune:

```ts
communicationStyle: string   // Injected verbatim into the prompt preamble
feedbackStyle: string        // How scores and rationale should feel
fillerWordNote: string       // What counts as a filler, culture-specific framing
contextOverrides?: Record<string, string>  // Per-context overrides (e.g. investor_pitch differs from team_talk)
```

After editing, run a test assessment in that locale and review the output qualitatively. No automated test covers Claude's generated FR prose.

---

## Translation review workflow

1. A developer adds/changes strings in `locales/fr.ts`
2. They add the changed keys to `FR_TRANSLATION_REVIEW.md` under the relevant priority section
3. A French-speaking reviewer (or native speaker contractor) checks the Priority 1 and Priority 2 entries
4. Reviewer signs off each row in the table (mark ✅ or leave a comment)
5. Developer addresses comments, re-checks, merges

Target: all Priority 1 + Priority 2 strings reviewed before each production deploy that touches i18n.

---

## Useful commands

```bash
# Check TypeScript for locale catalogue completeness
npx tsc --noEmit

# Find all inline isFr ternaries not yet migrated to the catalogue
grep -rn "isFr ?" app/ components/ --include="*.tsx" --include="*.ts"

# Find all trackContextSelected / trackAssessmentCompleted calls missing locale arg
grep -rn "trackContextSelected\|trackAssessmentCompleted" app/ components/ --include="*.tsx"
```
