import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGE_NAMES } from "../language-names";
import { AI_MODEL } from "../ai-model";
import { buildWritingLocaleBlock } from "../locale/prompt";

export interface OutlineScriptResult {
  script: string;
  note: string;
}

export class OutlineScriptError extends Error {}

function getClient(injected?: Anthropic) {
  if (injected) return injected;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

export async function generateOutlineScript(
  opts: {
    transcript: string;
    throughline: string | null;
    sections: { type: string; label: string; content: string }[] | null;
    coachingNote: string;
    locale?: string;
    userLocale?: string;
    contextId?: string;
  },
  client?: Anthropic
): Promise<OutlineScriptResult> {
  const anthropic = getClient(client);

  const spokenLang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";
  const lang = opts.userLocale === "fr" ? "French (français)" : spokenLang;
  const writingLocaleBlock = buildWritingLocaleBlock(opts.userLocale ?? "en", opts.contextId);

  const hasOutline = !!opts.throughline && !!opts.sections?.length;

  const outlineBlock = hasOutline
    ? `THROUGHLINE: ${opts.throughline}

SECTIONS TO EXPAND (in order):
${opts.sections!.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.label} — ${s.content}`).join("\n")}`
    : `No structured outline exists yet — there wasn't enough distinct material to build one. Work directly from the presenter's own words below and organize it into the clearest short talk you can, staying honest about what is and isn't there.`;

  const prompt = `You are a presentation coach helping a presenter turn a rough first pass into a spoken script they can rehearse from. This is early-stage material — a 2-minute unscripted overview, not a finished talk — so the script should read as a solid first draft to react to and rehearse, not a polished final version.

LANGUAGE: Write the script in ${lang}.
${writingLocaleBlock}

${outlineBlock}

THEIR ORIGINAL WORDS (Take transcript, for grounding — use their real phrasing and examples, don't invent new content or claims they didn't make):
${opts.transcript.slice(0, 6000)}

YOUR COACHING NOTE FROM THIS TAKE:
"${opts.coachingNote}"

TASK: Write a complete, speakable draft script that:
- Follows the throughline/section order above if one exists, otherwise organizes their own material into a clear opening → body → closing shape
- Uses their own ideas, phrasing, and examples — organize and connect, never invent facts, stories, or claims they didn't say
- Reads naturally aloud: short sentences land emphasis, varied rhythm, no filler
- ${hasOutline ? "Turns each outline point into a full spoken paragraph, not just a restated label" : "Is honest in tone about being a rough starting draft built from limited material — don't overclaim polish it doesn't have"}

Return ONLY valid JSON — no markdown, no code fences:
{
  "script": "the complete draft script, full text, ready to read aloud",
  "note": "1-2 sentence coach's note on this draft — what it's good for and what to develop further next"
}`;

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new OutlineScriptError(`No JSON object in Claude response: ${raw.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new OutlineScriptError(`Invalid JSON in Claude response: ${raw.slice(0, 200)}`);
  }

  const record = parsed as Record<string, unknown>;
  if (
    typeof parsed !== "object" || parsed === null ||
    typeof record.script !== "string" || !record.script.trim() ||
    typeof record.note !== "string" || !record.note.trim()
  ) {
    throw new OutlineScriptError(`Malformed outline-script response: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return { script: record.script, note: record.note };
}
