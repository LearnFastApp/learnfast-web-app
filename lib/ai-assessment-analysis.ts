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

  const prompt = `You are an expert presentation coach scoring a presenter across five core communication dimensions.
LANGUAGE: Write all text fields (rationale, highlights, tips, summary) in ${lang}.


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
