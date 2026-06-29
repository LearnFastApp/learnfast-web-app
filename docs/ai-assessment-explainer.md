# How LearnFast AI Assessment Works

## Overview

When a presenter uploads a recording, LearnFast runs it through a two-stage AI pipeline that analyses both **how you speak** (vocal signal) and **what you say** (verbal signal). The output is a score across all five LearnFast dimensions — Clarity, Energy, Engagement, Understanding and Connection — backed by specific evidence from the recording.

---

## Stage 1 — Transcription & Vocal Analysis (AssemblyAI)

The audio is sent to AssemblyAI, a specialist speech intelligence platform. This stage typically takes 1–3 minutes depending on recording length.

AssemblyAI extracts the following objective measurements:

| Measurement | What it captures |
|---|---|
| **Full transcript** | Word-for-word text with timestamps |
| **Filler words** | Count of "um", "uh", "umm", "uhh", "hmm" |
| **Words per minute** | Speaking pace across the recording |
| **Sentiment per sentence** | Whether each sentence is positive, neutral or negative in tone |
| **Auto-chapters** | Topic structure — how the presentation is organised |
| **Total duration** | Length of the recording in seconds |

These measurements form the **vocal signal** — objective, quantifiable data about delivery.

---

## Stage 2 — Verbal & Content Analysis (Claude AI)

The full transcript and all vocal statistics are sent to Claude (Anthropic's AI model). Claude reads the content and scores the presenter across all five dimensions.

The prompt instructs Claude to act as an expert presentation coach and to use the vocal stats as hard evidence when scoring — for example, a high filler word rate directly penalises Clarity; a very fast or slow pace affects Understanding and Energy.

Claude returns:

- **A score (0–100) for each dimension**
- **A one-sentence rationale** for each score, referencing specific evidence from the transcript or vocal stats
- **3–5 highlights** — exact quotes from the transcript labelled as a Strength or Opportunity, with the relevant dimension tagged
- **3 improvement tips** targeting the lowest-scoring dimensions
- **An overall summary** (2–3 sentences) of the presenter's strengths and primary development area

---

## How the Five Dimensions Are Scored

Each dimension draws on both vocal and verbal evidence:

### Clarity (0–100)
*Am I easy to follow?*
- **Vocal:** Filler word density, speaking pace (too fast = harder to follow), sentence completion
- **Verbal:** Logical structure, precise language, absence of jargon, use of signposting ("first... then... finally")
- **Benchmark:** >4 filler words per minute significantly penalises this score

### Energy (0–100)
*Am I compelling and dynamic?*
- **Vocal:** Volume variation, pace changes, positive sentiment proportion
- **Verbal:** Action verbs, exclamatory framing, momentum in the narrative
- **Benchmark:** Monotone delivery with flat sentiment = low score regardless of content

### Engagement (0–100)
*Am I holding attention?*
- **Vocal:** Tonal variation, rhetorical question delivery
- **Verbal:** Storytelling markers ("imagine…", "here's what happened"), rhetorical questions, memorable hooks and examples
- **Benchmark:** A presentation with no stories, questions or hooks scores low even if content is strong

### Understanding (0–100)
*Is my message landing clearly?*
- **Vocal:** Pace around key points (slowing down aids comprehension), strategic pauses
- **Verbal:** Analogies ("think of it like…"), concrete examples, repetition of key concepts, summary statements
- **Benchmark:** Ideal pace is 110–150 words per minute; significantly faster penalises this dimension

### Connection (0–100)
*Am I human and relatable?*
- **Vocal:** Warmth in tone, emotional range
- **Verbal:** Direct address ("you", "we", "your"), empathy language, inclusive framing, personal stories
- **Benchmark:** Presentations that speak *at* an audience rather than *to* them score low here

---

## The Three-Signal Radar

The results page shows up to three lines on a single radar chart:

| Signal | Colour | Source |
|---|---|---|
| **AI Assessment** | Amber | This recording |
| **Audience Feedback** | Violet | Most recent live session |
| **Self-Reflection** | Cyan (dashed) | Presenter's own post-session rating |

This three-signal view is unique to LearnFast — it lets presenters see whether their audience's perception, their own self-assessment and the AI's objective analysis are aligned or diverging. A gap between AI score and audience score, for example, can reveal whether a skill issue is about delivery or audience-specific context.

---

## Subscription Limits

| Plan | Monthly assessments |
|---|---|
| Free | Not available |
| Lite | 3 per month |
| Pro | Unlimited |

---

## What the Scores Mean

| Range | Interpretation |
|---|---|
| 80–100 | Strong — maintain and refine |
| 60–79 | Competent — targeted improvement will have high impact |
| 40–59 | Developing — this dimension needs focused practice |
| 0–39 | Priority focus — structured coaching recommended |

Scores are relative to professional presentation standards, not to other LearnFast users. A score of 65 in Clarity means the presenter is competent but has clear room to improve — it does not mean they are in the bottom 35% of users.

---

## Supported File Formats

MP4, MOV, WebM, MKV (video) · MP3, WAV, M4A (audio) · Max 500 MB
