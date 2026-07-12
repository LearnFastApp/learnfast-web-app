import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGE_NAMES } from "./language-names";
import { AI_MODEL } from "./ai-model";
import type { AssessmentScores } from "./ai-assessment-analysis";
import { getContext } from "./contexts/registry";
import { buildContextPromptBlock } from "./contexts/prompts";
import { buildLocaleBlock } from "./locale/prompt";

export interface OutlineSection {
  type: "opening" | "insight" | "reflection" | "closing";
  label: string;
  content: string;
}

/**
 * A structural outline for the talk, built from the presenter's own ideas —
 * never invented content. Combines two established, widely-cited
 * presentation-coaching frameworks:
 *  - Chris Anderson's "throughline" (TED Talks: The Official TED Guide to
 *    Public Speaking) — a single connecting idea, 15 words or fewer, that
 *    everything in the talk ties back to.
 *  - Nancy Duarte's "Sparkline" (Resonate; TED talk "The Secret Structure of
 *    Great Talks") — a talk oscillates between "what is" (present reality)
 *    and "what could be" (an idea), building contrast, resolving in a call
 *    to action / "new bliss" tied back to the throughline.
 */
export interface SuggestedOutline {
  throughline: string;
  sections: OutlineSection[];
}

export interface RehearsalCoaching {
  scores: AssessmentScores;
  comparison: string | null;
  strength: string;
  coaching: string;
  nextFocus: string[];
  encouragement: string;
  /** Only meaningful for triage-lite: true if there's enough distinct content
   * to start building a script from, false if the outline is still too thin
   * and needs another pass first. Absent/undefined for the standard
   * delivery-focused coaching path. */
  readyForScript?: boolean;
  /** Only present when triage-lite's readyForScript is true — null otherwise
   * (including for every non-triage-lite response). */
  suggestedOutline?: SuggestedOutline | null;
}

export interface PreviousTakeContext {
  takeNumber: number;
  scores: AssessmentScores;
}

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

interface CoachingPromptOpts {
  transcript: string;
  audioDurationSeconds: number;
  wordCount: number;
  fillerWordCount: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  takeNumber: number;
  previousTake: PreviousTakeContext | null;
}

/**
 * The standard rehearsal-coaching prompt — delivery-focused (pacing, vocal
 * energy, filler words, structure under performance conditions). Unchanged
 * from sv_2026_07_v2; used for every session type except triage-lite.
 */
function buildFullRunPrompt(opts: CoachingPromptOpts, lang: string, contextPromptBlock: string, localeBlock: string): string {
  const wpm =
    opts.audioDurationSeconds > 0
      ? Math.round((opts.wordCount / opts.audioDurationSeconds) * 60)
      : 0;
  const fillerRate =
    opts.audioDurationSeconds > 0
      ? ((opts.fillerWordCount / opts.audioDurationSeconds) * 60).toFixed(1)
      : "0";

  const contextBlock = opts.previousTake
    ? `This is Take ${opts.takeNumber}. The presenter's previous take (Take ${opts.previousTake.takeNumber}) scored:
- Clarity: ${opts.previousTake.scores.clarity}/100
- Energy: ${opts.previousTake.scores.energy}/100
- Engagement: ${opts.previousTake.scores.engagement}/100
- Understanding: ${opts.previousTake.scores.understanding}/100
- Connection: ${opts.previousTake.scores.connection}/100

Your "comparison" field MUST reference these scores explicitly — name what moved up, what moved down, and by how much. Celebrate genuine progress, address regression directly.`
    : `This is Take 1 — the opening baseline. Treat it as a starting point, not a verdict. "comparison" must be null.`;

  return `You are one of the world's foremost presentation coaches — someone who has coached heads of state, CEOs and world-class athletes on how to communicate with impact. You combine the warmth of a great teacher with the precision of a performance scientist. You hold yourself and your presenters to a high standard because you know they are capable of extraordinary delivery.

This presenter has chosen to rehearse. They are investing in themselves. Your job is to be their trusted coach through every take — specific, honest, encouraging, and always focused on what will make the next take better.

LANGUAGE: Write all fields in ${lang}.
${localeBlock}${contextPromptBlock}
${contextBlock}

SCORING CALIBRATION — apply this rigorously:
- 85–100: Exceptional. TED-talk or keynote quality. Reserve for genuinely outstanding delivery.
- 70–84: Strong. Clearly above professional standard with minor gaps.
- 55–69: Competent. Solid but with noticeable development areas. Most professionals sit here.
- 40–54: Developing. Clear weaknesses that impact the audience.
- 0–39: Significant gaps. Fundamental issues that need focused work.

Do NOT inflate scores to encourage. Honest calibration is what makes the coaching meaningful — they can only improve what they can accurately see.

FIVE DIMENSIONS (score each 0–100):
- Clarity [Cognitive Load Theory, Sweller 1988]: Clear structure, precise language, minimal jargon. High filler rates increase cognitive load on listeners.
- Energy [Vocal Dynamism, Burgoon & Saine 1978]: Enthusiasm, prosodic variation, vocal momentum and presence. WPM and sentiment are objective proxies — use them.
- Engagement [Narrative Transportation Theory, Green & Brock 2000]: Storytelling, hooks, rhetorical questions, memorable examples.
- Understanding [Dual Coding Theory, Paivio 1971]: Analogies, concrete examples, repetition of key ideas, accessible explanations.
- Connection [Rapport Theory, Tickle-Degnen & Rosenthal 1990]: Direct address, empathy, warmth, inclusive language.

VOCAL STATS (objective measurements — reference them):
- Words per minute: ${wpm} (ideal range: 110–150; too fast undermines Clarity, too slow drains Energy)
- Filler words: ${opts.fillerWordCount} total (${fillerRate}/min — above 4/min significantly penalises Clarity)
- Sentiment: ${opts.positivePercent}% positive, ${opts.neutralPercent}% neutral, ${opts.negativePercent}% negative

TRANSCRIPT (Take ${opts.takeNumber}):
${opts.transcript.slice(0, 6000)}

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "scores": { "clarity": 0-100, "energy": 0-100, "engagement": 0-100, "understanding": 0-100, "connection": 0-100 },
  "comparison": ${opts.previousTake ? '"string — e.g. \\"Clarity +8 ↑, Energy −3 ↓, Engagement +5 ↑, Understanding +2 ↑, Connection +1 ↑\\""' : "null"},
  "strength": "1–2 sentences on what is genuinely working. Be specific — reference the transcript directly. Name the moment, the phrase, the quality. Make them feel it.",
  "coaching": "2–3 sentences of primary coaching. Identify the single most important thing to work on. Explain WHY it matters for the audience — connect technique to impact. Be precise and vivid. Speak to them directly, like a coach in the room. Do not list multiple issues — focus on one.",
  "nextFocus": ["One specific, actionable directive for the next take — concrete enough to act on immediately", "Optional second directive only if it is truly independent of the first"],
  "encouragement": "One warm, direct closing sentence. Believe in them. Build momentum. Make them want to record the next take immediately."
}`;
}

/**
 * Planning-stage prompt for `triage-lite` (Gameday's 2-minute unscripted
 * outline — spec: "no slides or written content required"). This is a rough
 * idea-dump, not a rehearsed talk, so it is deliberately NOT scored or
 * coached on delivery (pacing, vocal energy, filler words) — vocal stats are
 * omitted from the prompt entirely so there's nothing to tempt that framing.
 * The five dimensions are reinterpreted (prompt-level only, same as the
 * Context Engine already does per-audience) to describe the STRENGTH OF THE
 * UNDERLYING IDEAS, and every qualitative field is reframed as planning
 * assistance for building the next (full) rehearsal, not a verdict on this one.
 */
function buildTriageLiteOutlinePrompt(opts: CoachingPromptOpts, lang: string, contextPromptBlock: string, localeBlock: string): string {
  const contextBlock = opts.previousTake
    ? `This is outline pass ${opts.takeNumber}. Their previous pass (${opts.previousTake.takeNumber}) rated:
- Clarity: ${opts.previousTake.scores.clarity}/100
- Energy: ${opts.previousTake.scores.energy}/100
- Engagement: ${opts.previousTake.scores.engagement}/100
- Understanding: ${opts.previousTake.scores.understanding}/100
- Connection: ${opts.previousTake.scores.connection}/100

Your "comparison" field should note how the IDEAS AND STRUCTURE have developed since then — not a delivery comparison.`
    : `This is their first outline pass — a rough starting point, not a verdict. "comparison" must be null.`;

  return `You are a presentation coach who was just in the room while a presenter thought out loud for 2 unscripted minutes about an upcoming talk — no slides, no script, nothing written yet. You are talking directly to them, right now, like a coach who grabbed them by the shoulder after they finished. Not a report. Not a form letter. A person reacting to what THIS specific person just said.

This is NOT a rehearsed presentation. Do NOT evaluate or comment on their delivery, pacing, vocal energy, tone, confidence, or filler words — none of that is relevant yet, because there is no content to deliver polished. Your entire job is to react to their IDEAS and hand them a clear next move.

CRITICAL — GROUND EVERYTHING IN WHAT THEY ACTUALLY SAID: Reference a specific idea, phrase, or moment from the transcript in "coaching" and "strength". Never write a sentence that could be copy-pasted onto a different presenter's transcript unchanged. If you find yourself writing something generic like "great overview, let's keep building" with no specific detail attached, rewrite it until it names something real from THIS transcript.

DECIDE: is there enough here to start building a structure? Set "readyForScript" based on whether there are at least a couple of distinct, articulable ideas or a rough sense of direction — even messy is fine. Set it false only if the outline was genuinely too thin, vague, or rambling to build a structure from (e.g. they talked in circles, gave one sentence, or never landed on what the talk is actually about).

- If readyForScript is true: build the "suggestedOutline" (methodology below), and make "coaching" sound like a coach who is pleased and moving them forward — name the specific strong idea, then point them at the outline you've just built for them below. Vary how you say this every time; never use the same sentence twice.
- If readyForScript is false: "suggestedOutline" must be null (there isn't enough material to structure yet). "coaching" should name specifically what's missing or unclear (referencing what they DID say), and directly ask them to record another quick outline pass focused on filling that specific gap — be concrete about what to talk through next, not just "give more detail".

OUTLINE METHODOLOGY (only when readyForScript is true) — combine two established presentation-coaching frameworks:
1. Chris Anderson's "throughline" (TED Talks: The Official TED Guide to Public Speaking): a single connecting idea, 15 words or fewer, that every part of the talk ties back to.
2. Nancy Duarte's "Sparkline" (Resonate; derived from analysing speeches including MLK's "I Have a Dream" and the Gettysburg Address): a talk oscillates between "what is" (the present reality the audience already lives in) and "what could be" (an idea that moves them forward), and resolves in a call to action tied back to the throughline.

Using ONLY the ideas the presenter actually raised — this is organizing and labelling what's already there, never inventing new content:
1. Identify the throughline in 15 words or fewer.
2. Build "sections" as a sequence: one "opening" (a hook establishing "what is" — why this matters right now), then 2-4 alternating "insight"/"reflection" pairs (each "insight" is a "what could be" moment built from an idea they raised; each "reflection" grounds it back in "what is" — why it matters to their actual audience), then one "closing" (a call to action or resolution that ties back to the throughline). Use however many insight/reflection pairs match how many distinct ideas they actually gave you — 1 pair is fine if that's all they raised; never pad with invented ideas to hit a target count.
3. Each section's "content" should be a short, concrete paragraph built from their actual words/ideas — something they could genuinely read back and recognise as their own thinking, organized.

LANGUAGE: Write all fields in ${lang}.
${localeBlock}${contextPromptBlock}
${contextBlock}

FIVE DIMENSIONS — for this outline stage, score each 0–100 based on the STRENGTH OF THE UNDERLYING IDEAS as described, never on delivery:
- Clarity: How clearly defined is the core message, even in rough form?
- Energy: How much genuine enthusiasm or conviction comes through in the ideas themselves (not the voice)?
- Engagement: How compelling or interesting are the angles, stories, or hooks they've mentioned?
- Understanding: How well would an audience grasp the core point if this were built out as described?
- Connection: How relevant or relatable are these ideas likely to be for their actual audience?
Score generously — this is a brainstorm, not a performance. A low score should only reflect genuinely thin or unclear ideas, never rough delivery.

TRANSCRIPT (outline pass ${opts.takeNumber}):
${opts.transcript.slice(0, 6000)}

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "scores": { "clarity": 0-100, "energy": 0-100, "engagement": 0-100, "understanding": 0-100, "connection": 0-100 },
  "comparison": ${opts.previousTake ? '"string describing how the ideas/structure have developed since the last pass"' : "null"},
  "readyForScript": true or false,
  "suggestedOutline": readyForScript ? { "throughline": "string, 15 words or fewer", "sections": [ { "type": "opening", "label": "Opening", "content": "string" }, { "type": "insight", "label": "Insight 1", "content": "string" }, { "type": "reflection", "label": "Reflection", "content": "string" }, "... more insight/reflection pairs as warranted ...", { "type": "closing", "label": "Closing", "content": "string" } ] } : null,
  "strength": "1-2 sentences naming the most promising idea, angle, or moment already present in what they said. Be specific — quote or reference it directly.",
  "coaching": "2-3 sentences, direct second-person coach voice, per the readyForScript instructions above. This is the main message they'll read — make it feel personal and specific to them, and make the next step unmistakable.",
  "nextFocus": ["One concrete action tied to what's actually missing or next — e.g. naming the specific gap to fill, or (if ready) which section of the outline to flesh out first", "Optional second action only if genuinely independent of the first"],
  "encouragement": "One short closing beat that fits the coaching tone above — energetic if ready, patient and inviting if more content is needed. Must reference something specific from this transcript, not a stock phrase."
}`;
}

export async function coachRehearsalTake(opts: {
  transcript: string;
  audioDurationSeconds: number;
  wordCount: number;
  fillerWordCount: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  takeNumber: number;
  previousTake: PreviousTakeContext | null;
  locale?: string;
  contextId?: string;
  userLocale?: string;
  /** Gameday session type, if this take was started from a plan. Only
   * "triage-lite" changes the prompt — everything else uses the standard
   * delivery-focused coaching prompt, byte-for-byte unchanged. */
  sessionType?: string;
}): Promise<RehearsalCoaching> {
  const client = getClient();

  const spokenLang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";
  const feedbackLang = opts.userLocale === "fr" ? "French (français)" : spokenLang;
  const lang = feedbackLang;

  const assessmentContext = getContext(opts.contextId ?? "general");
  const contextPromptBlock = buildContextPromptBlock(assessmentContext);
  const localeBlock = buildLocaleBlock(opts.userLocale ?? "en", opts.contextId ?? "general");

  const promptBuilder = opts.sessionType === "triage-lite" ? buildTriageLiteOutlinePrompt : buildFullRunPrompt;
  const prompt = promptBuilder(opts, lang, contextPromptBlock, localeBlock);

  // triage-lite's suggestedOutline (throughline + up to 4 sections of real
  // generated content) routinely runs past 1024 tokens and was getting cut
  // off mid-JSON — 2048 gives it headroom without materially affecting the
  // shorter full-run response.
  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const json = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Coaching response was not valid JSON: ${raw.slice(0, 200)}`);
  }

  if (!isValidRehearsalCoaching(parsed)) {
    throw new Error(`Coaching response did not match the expected shape: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return parsed;
}

/**
 * Runtime shape check on the model's response — `JSON.parse(...) as
 * RehearsalCoaching` is just a type assertion with no runtime guarantee, and
 * a subtly malformed response (missing/renamed field, wrong type) would
 * otherwise slip through as "success" with e.g. `scores: undefined`, which
 * then crashes the caller's Firestore write far away from this function,
 * leaving the take stuck in "analyzing" with no path to a terminal state.
 * Failing loudly here lets the existing try/catch at the call site mark the
 * take "failed" cleanly instead.
 */
function isValidRehearsalCoaching(value: unknown): value is RehearsalCoaching {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  const scores = v.scores as Record<string, unknown> | undefined;
  const hasValidScores =
    !!scores &&
    typeof scores === "object" &&
    (["clarity", "energy", "engagement", "understanding", "connection"] as const).every(
      (dim) => typeof scores[dim] === "number"
    );

  return (
    hasValidScores &&
    (v.comparison === null || typeof v.comparison === "string") &&
    (v.readyForScript === undefined || typeof v.readyForScript === "boolean") &&
    isValidSuggestedOutline(v.suggestedOutline) &&
    typeof v.strength === "string" &&
    v.strength.length > 0 &&
    typeof v.coaching === "string" &&
    v.coaching.length > 0 &&
    Array.isArray(v.nextFocus) &&
    v.nextFocus.every((f) => typeof f === "string") &&
    typeof v.encouragement === "string" &&
    v.encouragement.length > 0
  );
}

const VALID_OUTLINE_SECTION_TYPES = new Set(["opening", "insight", "reflection", "closing"]);

function isValidSuggestedOutline(value: unknown): value is SuggestedOutline | null | undefined {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.throughline === "string" &&
    v.throughline.length > 0 &&
    Array.isArray(v.sections) &&
    v.sections.length > 0 &&
    v.sections.every((s: unknown) => {
      if (!s || typeof s !== "object") return false;
      const section = s as Record<string, unknown>;
      return (
        typeof section.type === "string" &&
        VALID_OUTLINE_SECTION_TYPES.has(section.type) &&
        typeof section.label === "string" &&
        section.label.length > 0 &&
        typeof section.content === "string" &&
        section.content.length > 0
      );
    })
  );
}
