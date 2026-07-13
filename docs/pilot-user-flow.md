# LearnFast Enterprise — Pilot User Flow

**Brief for:** Design / User Flow Diagram
**Product:** LearnFast Enterprise (learnfastapp.com)
**Scope:** End-to-end journey for an enterprise pilot customer, from first access through to subscription conversion
**Audience:** L&D Manager or team leader trialling the platform for their organisation

---

## What LearnFast Does (Context)

LearnFast is a presentation coaching platform. Presenters collect real-time audience feedback during live sessions via QR code, record rehearsals for AI coaching analysis, and access curated learning resources matched to their weakest performance dimensions (Clarity, Energy, Engagement, Understanding, Connection).

The **Enterprise tier** adds:
- A shared org workspace with a team of seats
- Scheduled sessions with QR-code feedback (vs. ad-hoc personal sessions)
- Team coaching feed (members share sessions publicly for peer review)
- L&D analytics dashboard (aggregated scores across the team over time)
- Org content library (uploaded PDFs, videos, links)
- Member management and role assignment
- AI rehearsal analysis (up to 60-minute recordings)
- PDF report export from every session and AI analysis

---

## Pilot Setup (Admin Side — Not Part of the User Flow)

Before the pilot customer receives access, the LearnFast admin runs a provisioning script that:
- Creates the org with the agreed seat count (e.g. 5) and trial duration (e.g. 30 days)
- Sets no Stripe subscription — **the pilot customer cannot be charged during the trial**
- Generates a single-use invite link for the pilot contact's email address

The admin then sends **one link** to the pilot contact:

> `learnfastapp.com/org/join/{token}`

The customer does not need a LearnFast account before receiving this link. Signup and org access happen in a single step when they click it.

---

## Flow Overview

```
INVITE LINK → ACCOUNT SETUP → ORG DASHBOARD → ONBOARDING CHECKLIST → CORE USAGE LOOP → TRIAL EXPIRY → SUBSCRIBE
```

---

## Screen-by-Screen Flow

---

### 1. Invite Link — Account Setup

**URL:** `/org/join/{token}`

**Entry:** Pilot contact clicks the invite link sent by the LearnFast admin

**What they see on arrival (no account needed):**
- LearnFast logo
- Org name banner: **"You've been invited to join {Org Name} as an Owner"**
- Two tabs: **Create account** (default) / **Sign in** (if they already have an account)

**Path A — New user (no existing LearnFast account):**
- Enters their name and password (email is pre-filled and locked to the invited address)
- Clicks "Create account & join {Org Name}"
- Account is created and they join the org as Owner in one step
- Email is automatically verified — no separate verification email required

**Path B — Existing user (already has a LearnFast personal account):**
- Switches to "Sign in" tab
- Enters their password (email is pre-filled and locked)
- Clicks "Sign in & join {Org Name}"
- Joined to the org as Owner immediately

**After joining:**
- Brief "Welcome aboard!" confirmation screen
- Auto-redirected to `/{orgId}/dashboard`

**Error states:**
- Invalid or unrecognised token → "Invalid invitation" screen
- Token already accepted → "Already accepted" screen
- Token expired (trial period has passed) → "Invitation expired" screen
- Already a member of another org → "Already a member" screen
- Seat limit reached → "No seats available" screen

---

### 2. Org Dashboard — First Access

**URL:** `/{orgId}/dashboard`

**Entry:** Auto-redirected from the join page after accepting the invite

**What they see:**
- Org name and their role badge ("Owner")
- Trial status banner: **"{N} days remaining in your trial"** (amber, top of page — visible on every org page)
- 4-step onboarding checklist (see section 3)
- Empty analytics overview (no data yet)
- Left sidebar navigation: Dashboard · Sessions · My AI Analysis · Team Feed · Analytics · Members · Content · Settings · Billing

**Decision point:**
- If onboarding checklist is complete → checklist is hidden, dashboard shows activity overview
- If any steps remain → checklist is the primary focus

---

### 3. Onboarding Checklist

**Lives on:** `/{orgId}/dashboard` (dismisses when all 4 steps complete)

The checklist has 4 steps, each with a status indicator and a direct link:

| # | Step | Destination | Done when |
|---|------|-------------|-----------|
| 1 | Invite your team | `/members` | At least 1 invite sent |
| 2 | Add your logo | `/settings` | Logo uploaded |
| 3 | Schedule a session | `/sessions` | First session created |
| 4 | Collect audience feedback | `/sessions` | First QR scan recorded |

**Progress indicator:** "X / 4 complete" shown at the top of the checklist card.

---

### 4. Invite Team Members

**URL:** `/{orgId}/members`

**Entry:** From onboarding checklist Step 1, or sidebar

**What they see:**
- Member list (currently just themselves as Owner)
- "Invite member" button → opens modal

**Invite flow:**
- Enter email address
- Select role: **Member** (can present and get feedback), **Coach** (can view all sessions), **Admin** (can manage members and sessions), **Owner** (full billing access)
- Send invite → recipient gets a branded email with an accept link
- Invite status shows as "Pending" until accepted

**Invited user flow:**
- Receives invite email → clicks "Accept invite" → lands on `/org/join/{token}`
- Same join page as the pilot owner used: org name shown, email pre-filled and locked
- If no LearnFast account: creates password → account + org membership created in one step
- If existing account: signs in → joined to org immediately
- Lands on `/{orgId}/sessions`

**Seat constraint:** If the pilot has 5 seats and 5 are already used, the invite button is disabled with a "Seat limit reached" message and a link to Billing to adjust seats.

---

### 5. Settings — Add Branding

**URL:** `/{orgId}/settings`

**Entry:** Onboarding checklist Step 2

**What they see:**
- Organisation name (editable)
- Logo upload (drag-and-drop or file picker)
- Allowed email domains (optional — auto-join for company emails)
- Default session visibility (Private / Org-wide)

---

### 6. Sessions — Schedule a Live Session

**URL:** `/{orgId}/sessions`

**Entry:** Onboarding checklist Step 3, or sidebar

**What they see:**
- Session list (empty on first visit)
- "New session" button

**Create session flow:**
- Title
- Date and time
- Duration
- Session type: Presentation / Rehearsal / Meeting
- Visibility: Private (only presenter) or Org-wide (appears in team feed)
- Optional: add co-presenters from the member list

**After creation:**
- Session card appears in list with status "Scheduled"
- Status badge changes automatically: Scheduled → Live (15 min before start) → Completed (60 min after end)

---

### 7. Running a Live Session

**URL:** `/{orgId}/sessions` → click session card → expand

**Presenter view (during session):**
- QR code displayed (tap to fullscreen for projection)
- Join link (copy for Slack/email)
- Copy QR as PNG / Download QR
- Live response counter
- "Record session" mic button (records audio for AI assessment after)
- "End session" button

**Audience flow (separate device):**
- Scans QR code → lands on `/f/{feedbackCode}`
- Redirected to `/session/{code}` — the feedback form
- Rates 5 dimensions (0–100 sliders): Clarity, Energy, Engagement, Understanding, Connection
- Optional: leaves a comment (anonymous by default)
- Submits → sees "Thanks for your feedback!" screen

**After ending the session:**
- Status changes to "Completed"
- Presenter sees live score averages in the expanded card
- If audio was recorded: "Upload for AI assessment" prompt appears
- Delete button available on the session card

---

### 8. Post-Session — AI Assessment

**URL:** Session card → "Upload for AI assessment" (or `/{orgId}/my-sessions`)

**Two paths to AI assessment:**

**Path A — Live recording (new):**
- Presenter tapped "Record" before the session started
- Session ends → recording auto-stops → "Session recording ready · {size}" card appears
- One tap: "Upload for AI assessment" → uploads directly to Firebase Storage → submitted to AssemblyAI
- Upload progress bar shown

**Path B — File upload:**
- Presenter has a separate recording (phone, Zoom, etc.)
- Taps "Upload →" on the AI Analysis banner → file picker → selects MP4, M4A, WebM, MP3, WAV (max 500 MB, up to 60 min)
- Same upload + analysis flow

**Processing:**
- "Analysing your recording… AI scores will appear when ready · 1–3 minutes"
- Polling until complete

**Results page (`/ai-assessment/{id}`):**
- Presenter Archetype (The Expert / The Natural / The Technician / etc.)
- AI Summary paragraph
- Score bars: AI score vs. Audience score vs. Self-reflection (if recorded)
- Dimension breakdown with rationale and research basis
- Key moments (strength / opportunity quotes)
- Improvement tips per dimension
- Vocal statistics: duration, words/min, total words, filler words
- "Export PDF" button → branded 2-page PDF report

---

### 9. Team Coaching Feed

**URL:** `/{orgId}/community`

**Entry:** Sidebar → "Team Feed"

**What they see:**
- Cards for sessions marked as Org-wide visibility
- Each card shows: session title, presenter name, date, score bars, audience comments preview
- Tap to expand: full radar chart, all comments, any AI analysis

**Actions:**
- Admin/Owner can remove a session from the feed (X button on the card)
- Anyone can leave a comment

---

### 10. Analytics

**URL:** `/{orgId}/analytics`

**Entry:** Sidebar → "Analytics"

**What they see:**
- Team performance table: each member's row with scores across 5 dimensions and session count
- Sort by dimension to identify team-wide strengths/weaknesses
- Month-over-month trends (once sufficient data is collected)

---

### 11. My AI Analysis

**URL:** `/{orgId}/my-sessions`

**Entry:** Sidebar → "My AI Analysis"

**What they see:**
- List of their own sessions that have AI assessments attached
- Only shows sessions from within the org context (not pre-org personal sessions)
- Click any session → full AI assessment results page

---

### 12. Content Library

**URL:** `/{orgId}/content`

**Entry:** Sidebar → "Content"

**What they see:**
- Admin/Owner: "Upload" button → add PDFs, videos, links tagged to a dimension and visibility
- All members: browse org-curated content filtered by dimension
- Platform-wide premium content also visible

---

### 13. Rehearsal (AI Coaching)

**URL:** `/{orgId}/rehearse`

**Entry:** Sidebar → "AI Analysis" → "New Rehearsal" (or directly)

**Flow:**
- Same as the personal AI assessment upload, but scoped to the org
- Record up to 60 minutes or upload a file
- Results feed into the member's AI analysis history

---

### 14. Billing Page — During Trial

**URL:** `/{orgId}/billing`

**Entry:** Sidebar → "Billing", or any time they hit a seat limit

**What they see:**
- Status badge: **"Trial"** (amber)
- Trial days remaining countdown
- Seat usage bar: X used of Y seats
- Subscribe CTA:
  - Message: "Subscribe now to lock in your seat count and avoid interruption when your trial ends."
  - **Seat picker** (+ / − controls, defaults to current pilot seats, minimum = active members)
  - Live price preview: "10 seats · £150/mo"
  - Monthly / Annual toggle (Annual = 20% saving)
  - "Subscribe — 10 seats · £150/mo" button → Stripe Checkout

**Important:** This is the first point at which any payment details are entered. Nothing has been captured before this point.

---

### 15. Trial Expiry

**Trigger:** 30 days after provisioning (or whatever was agreed), midnight UTC

**What happens automatically:**
- `subscriptionStatus` changes from `"trialing"` to `"expired"` in Firestore
- All org pages return a 402 response
- Users are redirected to the billing page

**What the user sees on the billing page:**
- Status badge: **"Trial expired"** (red)
- Red banner: "Your trial has ended. Subscribe to restore full access — creating sessions and inviting members is paused until then."
- Same seat picker, interval toggle, and subscribe button as above
- All other org pages show a blocked/paywall state until subscribed

**No data is lost.** All sessions, feedback, AI assessments, and members remain intact.

---

### 16. Subscribe — Stripe Checkout

**Entry:** "Subscribe" button on billing page

**Flow:**
1. User sets seat count (e.g. 10 — not locked to the 5 pilot seats)
2. Selects Monthly or Annual
3. Clicks "Subscribe — 10 seats · £150/mo"
4. Redirected to **Stripe Checkout** (hosted page)
   - Enters company card details
   - Stripe shows line item: "LearnFast Enterprise · 10 seats · £150/month"
   - No trial period shown (trial has ended; first charge is immediate)
5. Payment confirmed → redirected to `/{orgId}/billing?success=true`

**On success:**
- Green banner: "Subscription activated. Welcome to LearnFast Enterprise!"
- Status badge changes to **"Active"** (green)
- All org features restored
- `org.seats.purchased` updated to 10 (or whatever was chosen)
- Seat adjustment (+/−) now available to increase/decrease seats with pro-rata billing

---

## Role Permissions Summary

| Feature | Member | Coach | Admin | Owner |
|---------|--------|-------|-------|-------|
| Create/run sessions | ✓ | ✓ | ✓ | ✓ |
| View team feed | ✓ | ✓ | ✓ | ✓ |
| View own AI analysis | ✓ | ✓ | ✓ | ✓ |
| View all member sessions | — | ✓ | ✓ | ✓ |
| Invite members | — | — | ✓ | ✓ |
| Remove members | — | — | ✓ | ✓ |
| Upload org content | — | — | ✓ | ✓ |
| Remove from team feed | — | — | ✓ | ✓ |
| Manage settings | — | — | ✓ | ✓ |
| Access billing / subscribe | — | — | — | ✓ |

---

## Key States & Status Badges

| Status | Colour | User impact |
|--------|--------|-------------|
| Trialing | Amber | Full access, trial countdown shown |
| Active | Green | Full access, subscription live |
| Trial expired | Red | Blocked; billing page shown; no data lost |
| Past due | Red | Stripe payment failed; warning banner shown |
| Cancelled | Slate | Blocked; can resubscribe |

---

## Design Notes

- **Dark UI:** The entire product uses a dark theme (`#05070d` background, white/slate text, violet accent `#7c3aed`)
- **Mobile-first:** All screens including the live session QR display and feedback form are mobile-optimised
- **Bilingual:** Full EN/FR localisation throughout (auto-detected from browser locale on public-facing pages)
- **No account required for feedback:** Audience members who scan the QR code do not need a LearnFast account
- **PDF exports:** Session reports and AI analysis reports export as clean white-background PDFs suitable for sharing with stakeholders
- **Trial banner:** The amber trial countdown appears at the top of every org page during the trial period — persistent but non-intrusive

---

## Out of Scope for This Pilot Flow

- Coach marketplace (booking 1:1 coaching calls)
- Slack integration
- Calendar sync (Google/Outlook)
- Custom subdomain / SSO
- >200 seats (enterprise volume pricing)
