import Anthropic from "@anthropic-ai/sdk";

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
  locale?: "en" | "fr";
  industry?: string | null;
  priorAssessments?: PriorAssessmentContext[];
}): Promise<AssessmentAnalysis> {
  const client = getClient();

  const wpm = opts.audioDurationSeconds > 0
    ? Math.round((opts.wordCount / opts.audioDurationSeconds) * 60)
    : 0;
  const fillerRate = opts.audioDurationSeconds > 0
    ? ((opts.fillerWordCount / opts.audioDurationSeconds) * 60).toFixed(1)
    : "0";
  const durationMins = Math.round(opts.audioDurationSeconds / 60);

  const lang = opts.locale === "fr" ? "French (français)" : "English";

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

  const prompt = `You are an expert presentation coach scoring a presenter across five core communication dimensions.
LANGUAGE: Write all text fields (rationale, highlights, tips, summary) in ${lang}.
${industryCtx}${historyBlock}

SCORING CALIBRATION — apply this strictly. Scores reflect professional presentation standards, not personal encouragement:
- 85–100: Exceptional. Conference keynote or TED-talk quality. Rare — only award when the evidence strongly supports it.
- 70–84: Strong. Clearly above average professional standard with only minor development areas.
- 55–69: Competent. Solid but with noticeable gaps. This is where most working professionals sit.
- 40–54: Developing. Below average professional standard. Clear weaknesses that impact the audience.
- 0–39: Significant gaps. Fundamental issues in this dimension that require focused work.

Most professionals score between 50–70. Do NOT inflate scores to be encouraging — honest, calibrated scoring is far more valuable to the presenter than flattery. If the presentation is average, scores should reflect that (50s–60s range). Reserve 75+ for genuinely strong delivery.

DIMENSIONS (score each 0–100):
- Clarity: Clear structure, precise language, minimal jargon, logical flow. Filler words and pace directly affect this.
- Energy: Enthusiasm, vocal dynamism, compelling delivery, momentum. Flat or monotone delivery lowers this.
- Engagement: Storytelling, rhetorical questions, memorable examples, hooks that capture attention.
- Understanding: Analogies, concrete examples, repetition of key ideas, accessible explanations that aid comprehension.
- Connection: Direct address ("you", "we"), empathy, warmth, inclusive language, human relatability.

VOCAL STATS (use these to inform your scores — they are objective measurements):
- Duration: ${durationMins} minutes
- Words per minute: ${wpm} (ideal: 110–150; too fast = poor Clarity/Understanding, too slow = poor Energy)
- Filler words: ${opts.fillerWordCount} total (${fillerRate} per minute; >4/min significantly penalises Clarity)
- Sentiment: ${opts.positivePercent}% positive, ${opts.neutralPercent}% neutral, ${opts.negativePercent}% negative sentences

TRANSCRIPT:
${opts.transcript.slice(0, 8000)}

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
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const json = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(json) as AssessmentAnalysis;
}
