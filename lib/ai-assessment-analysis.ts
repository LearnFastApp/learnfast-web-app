import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGE_NAMES } from "./language-names";
import { AI_MODEL } from "./ai-model";
import { getContext } from "./contexts/registry";
import { buildContextPromptBlock } from "./contexts/prompts";
import { buildLocaleBlock } from "./locale/prompt";

const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

export interface AssessmentScores {
  clarity: number;
  energy: number;
  engagement: number;
  understanding: number;
  connection: number;
}

export interface AssessmentHighlight {
  quote: string;
  dimension: Dimension;
  type: "strength" | "opportunity";
}

export interface AssessmentTip {
  dimension: Dimension;
  tip: string;
}

export interface AssessmentAnalysis {
  scores: AssessmentScores;
  rationale: Record<Dimension, string>;
  highlights: AssessmentHighlight[];
  tips: AssessmentTip[];
  summary: string;
}

export interface PriorAssessmentContext {
  label: string; // e.g. "2 weeks ago"
  scores: AssessmentScores;
}

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

export async function analyseTranscript(opts: {
  transcript: string;
  audioDurationSeconds: number;
  wordCount: number;
  fillerWordCount: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  locale?: string;
  industry?: string | null;
  priorAssessments?: PriorAssessmentContext[];
  contextId?: string;
  userLocale?: string;
}): Promise<AssessmentAnalysis> {
  const client = getClient();

  const wpm = opts.audioDurationSeconds > 0
    ? Math.round((opts.wordCount / opts.audioDurationSeconds) * 60)
    : 0;
  const fillerRate = opts.audioDurationSeconds > 0
    ? ((opts.fillerWordCount / opts.audioDurationSeconds) * 60).toFixed(1)
    : "0";
  const durationMins = Math.round(opts.audioDurationSeconds / 60);

  const lang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";

  const context = getContext(opts.contextId ?? "general");
  const contextBlock = buildContextPromptBlock(context);
  const localeBlock = buildLocaleBlock(opts.userLocale ?? "en", opts.contextId ?? "general");

  const industryCtx = opts.industry
    ? `\nPRESENTER CONTEXT: Industry/sector — ${opts.industry}. Tailor coaching language and examples to this professional context where relevant.\n`
    : "";

  const prior = opts.priorAssessments ?? [];
  const historyBlock = prior.length > 0
    ? `\nDEVELOPMENT HISTORY (most recent first — use this to write comparative commentary):
${prior.map((p) =>
  `- ${p.label}: Clarity ${p.scores.clarity}, Energy ${p.scores.energy}, Engagement ${p.scores.engagement}, Understanding ${p.scores.understanding}, Connection ${p.scores.connection}`
).join("\n")}
In the summary, include ONE sentence noting the most significant change since the previous session (improvement or regression). If a dimension has been consistently low across all prior sessions, acknowledge it as a persistent development area rather than repeating the same advice. If a dimension has improved meaningfully (≥8 points), acknowledge the progress explicitly.\n`
    : "\nThis is the presenter's first assessment — no prior history available. Provide a clear baseline assessment.\n";

  // Mixed-language note: if French user presents in English, note it in feedback
  const spokenLang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";
  const feedbackLang = opts.userLocale === "fr" ? "French (français)" : spokenLang;
  const mixedLangNote = opts.userLocale === "fr" && (opts.locale ?? "en") !== "fr"
    ? `\nNOTE: This presentation was delivered in ${spokenLang}. Deliver all written feedback in French as per the user's language preference. Include one sentence noting: "Votre présentation était en ${spokenLang === "English" ? "anglais" : spokenLang} ; le retour est fourni en français."\n`
    : "";

  const prompt = `You are an expert presentation coach scoring a presenter across five core communication dimensions.
LANGUAGE: Write all text fields (rationale, highlights, tips, summary) in ${feedbackLang}.
${localeBlock}${contextBlock}${mixedLangNote}${industryCtx}${historyBlock}

SCORING CALIBRATION — apply this strictly. Scores reflect professional presentation standards, not personal encouragement:
- 85–100: Exceptional. Conference keynote or TED-talk quality. Rare — only award when the evidence strongly supports it.
- 70–84: Strong. Clearly above average professional standard with only minor development areas.
- 55–69: Competent. Solid but with noticeable gaps. This is where most working professionals sit.
- 40–54: Developing. Below average professional standard. Clear weaknesses that impact the audience.
- 0–39: Significant gaps. Fundamental issues in this dimension that require focused work.

Most professionals score between 50–70. Do NOT inflate scores to be encouraging — honest, calibrated scoring is far more valuable to the presenter than flattery. If the presentation is average, scores should reflect that (50s–60s range). Reserve 75+ for genuinely strong delivery.

DIMENSIONS (score each 0–100, criteria grounded in established communication science):
- Clarity [Cognitive Load Theory, Sweller 1988; disfluency research, Clark & Fox Tree 2002]: Clear structure, precise language, minimal jargon, logical flow. High filler word rates increase the cognitive load imposed on listeners, degrading comprehension. Score lower when the audience would need to expend significant mental effort to follow.
- Energy [Vocal Dynamism, Burgoon & Saine 1978; speech rate research, Miller et al. 1976]: Enthusiasm, prosodic variation, vocal momentum and presence. Flat, monotone delivery lacks the arousal cues that signal importance and sustain attention. WPM and sentiment are objective proxies — use them.
- Engagement [Narrative Transportation Theory, Green & Brock 2000; rhetorical device research, Petty et al. 1981]: Storytelling, hooks, rhetorical questions, memorable examples. Narrative transport reduces audience counterarguing and improves retention. Score higher when the presenter uses attention-recapture techniques and narrative devices.
- Understanding [Dual Coding Theory, Paivio 1971; Elaboration Likelihood Model, Petty & Cacioppo 1986]: Analogies, concrete examples, repetition of key ideas, accessible explanations. Concrete + verbal encoding creates stronger memory traces than abstract language alone. Score on how well a listener could recall and explain the core message.
- Connection [Rapport Theory, Tickle-Degnen & Rosenthal 1990; Social Presence, Short et al. 1976]: Direct address ("you", "we"), empathy, warmth, inclusive language. High social presence reduces psychological distance between speaker and audience. Score on the degree of human relatability and genuine warmth communicated.

RATIONALE STYLE: Reference the underlying mechanism when directly evidenced by what you observe in the transcript or vocal stats. Use research-informed language naturally — not as academic citations, but as explanatory frameworks ("your filler word rate increases cognitive load on the audience" rather than just "you used too many filler words"). All text in ${lang}.

VOCAL STATS (use these to inform your scores — they are objective measurements):
- Duration: ${durationMins} minutes
- Words per minute: ${wpm} (ideal: 110–150; too fast = poor Clarity/Understanding, too slow = poor Energy)
- Filler words: ${opts.fillerWordCount} total (${fillerRate} per minute; >4/min significantly penalises Clarity)
- Sentiment: ${opts.positivePercent}% positive, ${opts.neutralPercent}% neutral, ${opts.negativePercent}% negative sentences

TRANSCRIPT:
${opts.transcript.slice(0, 60000)}

Return ONLY valid JSON with no markdown, no explanation, no code fences:
{
  "scores": { "clarity": 0-100, "energy": 0-100, "engagement": 0-100, "understanding": 0-100, "connection": 0-100 },
  "rationale": {
    "clarity": "one sentence referencing specific evidence from the transcript or vocal stats",
    "energy": "one sentence",
    "engagement": "one sentence",
    "understanding": "one sentence",
    "connection": "one sentence"
  },
  "highlights": [
    { "quote": "exact short quote from transcript (max 20 words)", "dimension": "clarity|energy|engagement|understanding|connection", "type": "strength|opportunity" }
  ],
  "tips": [
    { "dimension": "clarity|energy|engagement|understanding|connection", "tip": "specific, actionable improvement in 1 sentence" }
  ],
  "summary": "2–3 sentence overall assessment of the presenter's strengths and primary development area."
}

Include 3–5 highlights (mix of strengths and opportunities) and exactly 3 tips targeting the lowest-scoring dimensions.`;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  // Extract the outermost JSON object — handles preamble text and code fences
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in Claude response: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1)) as AssessmentAnalysis;
}
