import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGE_NAMES } from "./language-names";
import { AI_MODEL } from "./ai-model";
import type { AssessmentScores } from "./ai-assessment-analysis";

export interface RehearsalCoaching {
  scores: AssessmentScores;
  comparison: string | null;
  strength: string;
  coaching: string;
  nextFocus: string[];
  encouragement: string;
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
}): Promise<RehearsalCoaching> {
  const client = getClient();

  const wpm =
    opts.audioDurationSeconds > 0
      ? Math.round((opts.wordCount / opts.audioDurationSeconds) * 60)
      : 0;
  const fillerRate =
    opts.audioDurationSeconds > 0
      ? ((opts.fillerWordCount / opts.audioDurationSeconds) * 60).toFixed(1)
      : "0";

  const lang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";

  const contextBlock = opts.previousTake
    ? `This is Take ${opts.takeNumber}. The presenter's previous take (Take ${opts.previousTake.takeNumber}) scored:
- Clarity: ${opts.previousTake.scores.clarity}/100
- Energy: ${opts.previousTake.scores.energy}/100
- Engagement: ${opts.previousTake.scores.engagement}/100
- Understanding: ${opts.previousTake.scores.understanding}/100
- Connection: ${opts.previousTake.scores.connection}/100

Your "comparison" field MUST reference these scores explicitly — name what moved up, what moved down, and by how much. Celebrate genuine progress, address regression directly.`
    : `This is Take 1 — the opening baseline. Treat it as a starting point, not a verdict. "comparison" must be null.`;

  const prompt = `You are one of the world's foremost presentation coaches — someone who has coached heads of state, CEOs and world-class athletes on how to communicate with impact. You combine the warmth of a great teacher with the precision of a performance scientist. You hold yourself and your presenters to a high standard because you know they are capable of extraordinary delivery.

This presenter has chosen to rehearse. They are investing in themselves. Your job is to be their trusted coach through every take — specific, honest, encouraging, and always focused on what will make the next take better.

LANGUAGE: Write all fields in ${lang}.

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

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const json = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(json) as RehearsalCoaching;
}
