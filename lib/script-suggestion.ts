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
  previousSuggestions?: string[];
}): Promise<ScriptSuggestion> {
  const client = getClient();

  const spokenLang = LANGUAGE_NAMES[opts.locale ?? "en"] ?? "English";
  const lang = opts.userLocale === "fr" ? "French (français)" : spokenLang;
  const writingLocaleBlock = buildWritingLocaleBlock(opts.userLocale ?? "en", opts.contextId);

  const sortedDims = Object.entries(opts.scores).sort((a, b) => a[1] - b[1]);
  const weakestDims = sortedDims.slice(0, 3).map(([d]) => d);
  const scriptDims = weakestDims.filter((d) => SCRIPT_ADDRESSABLE.has(d));
  const deliveryDims = weakestDims.filter((d) => DELIVERY_ONLY.has(d));

  const dimensionContext = sortedDims
    .map(([d, s]) => `${d}: ${s}/100`)
    .join(", ");

  const prevSuggestions = opts.previousSuggestions ?? [];
  const previousSuggestionsBlock = prevSuggestions.length > 0
    ? `\nPREVIOUS SCRIPT SUGGESTIONS ALREADY GIVEN (vary your approach — do not repeat the same rewrites or techniques; find fresh angles on the same weaknesses):
${prevSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const prompt = `You are one of the world's foremost speechwriters and presentation coaches, with command of the full canon of communication science and rhetorical craft. A presenter has completed Take ${opts.takeNumber} of a rehearsal session. Your task is to rewrite specific passages of their script to produce a meaningfully stronger version.

LANGUAGE: Write all output fields in ${lang}.
${writingLocaleBlock}

SCIENTIFIC FOUNDATIONS — apply these frameworks precisely, not decoratively:

CLARITY [target: reduce cognitive load on the listener]
— Cognitive Load Theory (Sweller, 1988): one idea per sentence; eliminate extraneous clauses that force the listener to hold multiple threads simultaneously
— Signalling Principle (Mayer, 2001): explicit advance organizers ("Here's what I'll cover…"), numbered sequences, and clear transitions reduce mental effort by 40%
— Plain Language (Cutts, 2013): active voice, concrete nouns, sentences under 20 words — every abstraction costs the audience processing capacity
— Replace: vague hedges ("kind of", "sort of", "in some ways"), nominalizations ("the achievement of" → "achieving"), passive constructions

ENGAGEMENT [target: sustain attention and reduce counterarguing]
— Narrative Transportation Theory (Green & Brock, 2000): a well-placed story transports the audience out of critical evaluation mode — use specific characters, stakes, and outcomes
— Curiosity Gap (Loewenstein, 1994): open a question the audience needs answered before delivering the answer — information gaps are more motivating than information dumps
— Monroe's Motivated Sequence (1935): Attention → Need → Satisfaction → Visualization → Action — check whether the passage follows this logic
— Rhetorical devices (Petty et al., 1981): tricolon (rule of three), anaphora, rhetorical questions increase memorability and persuasive impact
— Hook recapture: if a passage sags, insert a micro-hook ("Here's what surprised me about this…")

UNDERSTANDING [target: maximize retention and recall]
— Dual Coding Theory (Paivio, 1971): pair every abstract claim with a concrete verbal image or analogy — dual encoding creates stronger memory traces than abstract language alone
— Concreteness Principle (Heath & Heath, 2007 — "Made to Stick"): "a 62-year-old nurse who has worked nights for 20 years" is remembered; "a healthcare professional" is not. Specificity signals credibility
— Elaboration Likelihood Model (Petty & Cacioppo, 1986): central route processing (deep comprehension) is activated by concrete, relevant examples — not abstract assertions
— Curse of Knowledge mitigation: assume the audience has no background. Define terms, use analogies, repeat the core message in three different ways

CONNECTION [target: reduce psychological distance between speaker and audience]
— Rapport Theory (Tickle-Degnen & Rosenthal, 1990): mutual attention, positivity, and coordination cues — "you" and "we" language, acknowledged shared experience, direct eye-line phrasing
— Vulnerability and authenticity (Brown, 2010): a brief, genuine moment of self-disclosure ("I got this wrong for years…") builds trust faster than any credential
— Common ground: name the audience's actual situation before proposing a solution — people commit to advice from someone who understands their problem
— Social presence (Short et al., 1976): phrases that create immediacy ("Imagine you're in the room when…", "You've probably felt…") reduce the distance of public address

SPEECHWRITING CRAFT RULES (apply to every revision):
— Speakability: every revised sentence must be comfortably deliverable in one breath. Read it aloud internally before writing it
— Sentence rhythm: vary length deliberately. Short sentences land emphasis. Longer sentences build context and nuance before the punch
— Specificity over abstraction: replace percentages with human stories; replace categories with individuals
— The "So What" test: every passage must implicitly answer why the audience should care, right now
— Preserve voice: improve the structure and precision, not the personality — the presenter must recognise their own words

YOUR COACHING FEEDBACK FROM THIS TAKE:
"${opts.coachingNote}"

FOCUS FOR NEXT TAKE:
${opts.nextFocus.map((f) => `- ${f}`).join("\n")}

DIMENSION SCORES: ${dimensionContext}

DIMENSIONS WHERE SCRIPT REWRITES WILL HELP: ${scriptDims.length > 0 ? scriptDims.join(", ") : "none identified — all weaknesses are delivery-based"}
${deliveryDims.length > 0 ? `DIMENSIONS THAT REQUIRE DELIVERY PRACTICE (script changes will not help): ${deliveryDims.join(", ")}` : ""}
${previousSuggestionsBlock}
THEIR TRANSCRIPT (Take ${opts.takeNumber}):
${opts.transcript.slice(0, 6000)}

Identify 3–5 specific passages where a rewrite will produce a meaningfully stronger result. For each:
- Quote the original text exactly
- Write a revised version grounded in the specific scientific principle that applies
- Explain the specific mechanism: why does this change help the audience? Connect technique to audience cognition
- Name the dimension and the principle you applied

Then provide the complete revised script incorporating all changes — full, speakable, ready to rehearse.

Return ONLY valid JSON — no markdown, no code fences:
{
  "coachNote": "2–3 sentence overview in your coaching voice — warm, direct, specific about what these changes achieve and why they will land differently with an audience",
  "sections": [
    {
      "original": "exact quote from their transcript",
      "revised": "your rewritten version",
      "reason": "specific mechanism: name the principle and explain the audience impact",
      "dimension": "clarity|engagement|understanding|connection"
    }
  ],
  "fullRevisedScript": "complete revised script — full text, speakable, all changes incorporated",
  "deliveryNote": ${deliveryDims.length > 0 ? `"one sentence acknowledging that ${deliveryDims.join(" and ")} can only be improved through vocal practice, not script changes — direct them to focus on that in the next take"` : "null"}
}`;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    temperature: 0.8,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in Claude response: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1)) as ScriptSuggestion;
}
