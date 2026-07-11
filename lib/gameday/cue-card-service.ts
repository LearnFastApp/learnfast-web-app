import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "../ai-model.ts";

export interface CueCardExtractionInput {
  transcript: string;
  locale?: string;
}

export interface CueCardLines {
  openingLine: string;
  anchors: [string, string, string];
  closingLine: string;
}

/**
 * Thrown for any failure in cue-card extraction — missing key, network
 * error, or a malformed/unparseable model response. Callers (the API route)
 * catch this specifically and fall back to the manual-edit UI, per spec:
 * "manual-edit fallback UI if the call fails."
 */
export class CueCardExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CueCardExtractionError";
  }
}

type MessagesClient = Pick<Anthropic, "messages">;

function getClient(): MessagesClient {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new CueCardExtractionError("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

function buildPrompt(transcript: string, locale: string): string {
  const lang = locale === "fr" ? "French (français)" : "English";
  return `You are a presentation coach preparing a presenter's cue card for the day of their event — the ONE thing they'll glance at backstage or in a corridor with no time to reread a script.

From the transcript of their best rehearsal take below, extract exactly:
- An opening line (their actual opening, tightened if needed — not invented from scratch)
- Three anchor points (the load-bearing ideas/transitions of the talk, in delivery order)
- A closing line (their actual closing, tightened if needed)

Keep every line short enough to read in one glance under pressure. Use their own words and phrasing wherever possible — this is extraction, not rewriting.

LANGUAGE: Write all fields in ${lang}.

TRANSCRIPT:
${transcript.slice(0, 6000)}

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "openingLine": "string",
  "anchors": ["string", "string", "string"],
  "closingLine": "string"
}`;
}

function isValidCueCardShape(value: unknown): value is CueCardLines {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.openingLine === "string" &&
    v.openingLine.length > 0 &&
    typeof v.closingLine === "string" &&
    v.closingLine.length > 0 &&
    Array.isArray(v.anchors) &&
    v.anchors.length === 3 &&
    v.anchors.every((a) => typeof a === "string" && a.length > 0)
  );
}

/**
 * The one isolated Anthropic call for Gameday Mode (spec §2/§4 Operating
 * Rule 4). `client` is injectable for testing — production callers omit it
 * and get a real Anthropic client built from ANTHROPIC_API_KEY.
 */
export async function extractCueCard(
  input: CueCardExtractionInput,
  client: MessagesClient = getClient()
): Promise<CueCardLines> {
  const prompt = buildPrompt(input.transcript, input.locale ?? "en");

  let raw: string;
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") throw new Error("unexpected non-text response block");
    raw = block.text.trim();
  } catch (err) {
    throw new CueCardExtractionError(err instanceof Error ? err.message : String(err));
  }

  const json = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new CueCardExtractionError("Model response was not valid JSON");
  }

  if (!isValidCueCardShape(parsed)) {
    throw new CueCardExtractionError("Model response did not match the expected cue card shape");
  }

  return parsed;
}
