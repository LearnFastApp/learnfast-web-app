# QA: French Generation Test Plan

Manual test checklist for the FR localisation build. Run before merging to production.

## Environment setup

1. Sign in as a test user
2. Go to Settings → Language → set to **Français** → Save
3. Confirm the UI reloads in French

---

## Test suite A — Signed-in rehearsal flow (presenter, locale = fr)

### A1. Create rehearsal (record tab)
- [ ] Create Rehearsal modal opens with FR strings
- [ ] Context dropdown shows FR labels (e.g. "Prise de parole générale")
- [ ] Context descriptions are in French
- [ ] Record, stop, preview controls are in French
- [ ] Submit succeeds — session created

### A2. Assessment results
- [ ] Poll `/api/ai-assessment/[id]` until `status === "complete"`
- [ ] `contextLabelAtTime` in Firestore doc is in French
- [ ] `userLocale` field on assessment doc is `"fr"`
- [ ] Score rationale paragraphs are in French (not a translation — Claude should generate in FR)
- [ ] Tips are written in French
- [ ] Summary paragraph is in French and culturally appropriate (formal register, direct feedback)
- [ ] Filler word count counts "euh", "ben", "alors" etc (trigger by saying them in recording)

### A3. Dashboard
- [ ] Page title, nav items, and welcome message in French
- [ ] "Tout voir" / "Nouvelle répétition" buttons in French
- [ ] Session cards display correctly

### A4. Settings page
- [ ] FR locale picker shows "Français" as selected
- [ ] Saving EN switches back correctly + page reloads

---

## Test suite B — Guest try flow

### B1. Guest page (`/try`)
- [ ] Page loads for a guest (no auth)
- [ ] Context selector shows contexts (FR labels if locale cookie set; EN otherwise)
- [ ] `locale_set` event NOT fired (guest has no preference)
- [ ] Submit a recording, poll results
- [ ] `userLocale` on guest assessment doc is `"en"` (guests are always EN)

### B2. Guest results page (`/try/[token]`)
- [ ] Results render correctly
- [ ] `assessment_completed` gtag event fires with correct `context_id` and `locale` fields

---

## Test suite C — Org flow

### C1. Org settings — admin locale picker
- [ ] Sign in as org owner
- [ ] Navigate to `/[orgId]/settings`
- [ ] "Default member language" section visible with EN/FR toggle
- [ ] Select "Français" → Save → success message
- [ ] Re-load page — FR still selected
- [ ] GET `/api/org/[orgId]/info` returns `defaultLocale: "fr"`

### C2. Org join — locale inheritance
- [ ] Create a new test account with **no locale set** (fresh account)
- [ ] Join org via invite link while org `defaultLocale === "fr"`
- [ ] After join, check `presenters/{uid}.locale` in Firestore → should be `"fr"`
- [ ] Sign in as that new member → app loads in French

### C3. Locale inheritance — existing preference wins
- [ ] Create test account, manually set `presenters/{uid}.locale = "en"` in Firestore
- [ ] Join org with `defaultLocale === "fr"`
- [ ] Verify `presenters/{uid}.locale` remains `"en"` (org default does NOT override)

---

## Test suite D — Email

### D1. Org invite email (FR org)
- [ ] Set org `defaultLocale = "fr"` in Firestore
- [ ] Send invite via admin panel
- [ ] Verify invite email subject is in French
- [ ] Verify expiry date formatted as `DD/MM/YYYY` (FR format)

### D2. Session confirmation email (FR presenter)
- [ ] Create a session as a FR-locale presenter
- [ ] Verify confirmation email subject line is in French

---

## Test suite E — Telemetry

Open browser DevTools → Network → filter `gtag`

### E1. `context_selected` event
- [ ] Select a non-general context in Create Rehearsal modal
- [ ] Event fires with `context_id`, `surface: "app"`, `locale: "fr"` (or "en")

### E2. `assessment_completed` event
- [ ] Assessment completes on guest results page
- [ ] Event fires with `context_id`, `context_prompt_version`, `locale` fields

### E3. `locale_set` event
- [ ] Change language in Settings → event fires with `locale` and `source: "setting"`
- [ ] Change language in Dashboard → event fires with `locale` and `source: "setting"`

---

## Pass criteria

All checkboxes above ticked. Any failures block the production deploy.

## Known limitations

- AI-generated FR output depends on Claude's FR quality — if output is poor, escalate to culture profile tuning in `lib/ai-locale-block.ts` before blaming the UI layer.
- Guest try page always scores as `userLocale: "en"` regardless of browser locale — this is intentional for Phase 1 scope.
