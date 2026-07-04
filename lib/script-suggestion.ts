import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGE_NAMES } from "./language-names";
import { AI_MODEL } from "./ai-model";
import { buildWritingLocaleBlock } from "./locale/prompt";

// Dimensions that script changes can address vs. delivery-only improvements
const SCRIPT_ADDRESSABLE = new Set(["clarity", "engagement", "understanding", "connection"]);
const DELIVERY_ONLY = new Set(["energy"]);

export interface ScriptSection {
  original: string;
  revised: string;
  reason: string;
  dimension: string;
}

export interface ScriptSuggestion {
  coachNote: string;
  sections: ScriptSection[];
  fullRevisedScript: string;
  deliveryNote: string | null;
}

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

export async function generateScriptSuggestion(opts: {
  transcript: string;
  scores: Record<string, number>;
  coachingNote: string;
  nextFocus: string[];
  takeNumber: number;
  locale?: string;
  userLocale?: string;
  contextId?: string;
}): Promise<ScriptSuggestion> {
  const client = getClient();

  const spokenLang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";
  const lang = opts.userLocale === "fr" ? "French (français)" : spokenLang;
  const writingLocaleBlock = buildWritingLocaleBlock(opts.userLocale ?? "en", opts.contextId);

  // Sort dimensions by score ascending — weakest first
  const sortedDims = Object.entries(opts.scores).sort((a, b) => a[1] - b[1]);
  const weakestDims = sortedDims.slice(0, 3).map(([d]) => d);
  const scriptDims = weakestDims.filter((d) => SCRIPT_ADDRESSABLE.has(d));
  const deliveryDims = weakestDims.filter((d) => DELIVERY_ONLY.has(d));

  const dimensionContext = sortedDims
    .map(([d, s]) => `${d}: ${s}/100`)
    .join(", ");

  const prompt = `You are one of the world's foremost presentation coaches. A presenter has just completed Take ${opts.takeNumber} of a rehearsal session and received coaching feedback. They have asked you to suggest specific script improvements based on that feedback.

LANGUAGE: Write all output fields in ${lang}.
${writingLocaleBlock}

YOUR COACHING FEEDBACK FROM THIS TAKE:
"${opts.coachingNote}"

FOCUS FOR NEXT TAKE:
${opts.nextFocus.map((f) => `- ${f}`).join("\n")}

DIMENSION SCORES: ${dimensionContext}

DIMENSIONS THAT SCRIPT CHANGES CAN ADDRESS: ${scriptDims.length > 0 ? scriptDims.join(", ") : "none identified"}
${deliveryDims.length > 0 ? `DIMENSIONS THAT REQUIRE DELIVERY PRACTICE (not script changes): ${deliveryDims.join(", ")}` : ""}

THEIR TRANSCRIPT (Take ${opts.takeNumber}):
${opts.transcript.slice(0, 6000)}

YOUR TASK:
Identify 3–5 specific passages from the transcript that, if rewritten, would meaningfully improve the weakest scriptable dimensions. For each passage:
- Quote the original text exactly as they said it
- Provide a revised version that improves the target dimension
- Give a clear, specific reason why this change helps — connect it to audience impact
- Name the dimension it targets

Then provide a full revised version of the entire script incorporating all changes.

RULES:
- Preserve the presenter's voice, personality and core message — improve, don't replace
- Keep revisions natural and speakable — this is spoken word, not written prose
- Focus only on dimensions where script changes genuinely help (${scriptDims.join(", ") || "structural clarity"})
- Do not fabricate content or add ideas that weren't in the original
- If the original is already strong in a dimension, do not change those parts

Return ONLY valid JSON — no markdown, no code fences:
{
  "coachNote": "2–3 sentence overview of the direction of these changes and why they will help — in your coaching voice, warm and direct",
  "sections": [
    {
      "original": "exact quote from their transcript",
      "revised": "your suggested revision",
      "reason": "specific reason this change improves delivery — connect technique to audience impact",
      "dimension": "clarity|engagement|understanding|connection"
    }
  ],
  "fullRevisedScript": "the complete revised script incorporating all changes — full text, speakable, ready to rehearse",
  "deliveryNote": ${deliveryDims.length > 0 ? `"one sentence acknowledging that ${deliveryDims.join(" and ")} can only be improved through practice, not script changes"` : "null"}
}`;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const json = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(json) as ScriptSuggestion;
}
