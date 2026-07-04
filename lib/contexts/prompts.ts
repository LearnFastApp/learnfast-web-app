import type { AssessmentContext } from "./registry";
import { DIMENSIONS } from "./registry";

const WEIGHT_LABELS: Record<string, string> = {
  low: "low",
  standard: "standard",
  high: "high",
  critical: "CRITICAL",
};

export function buildContextPromptBlock(context: AssessmentContext): string {
  if (context.contextId === "general") {
    // General context = no injection needed — preserves pre-feature behaviour exactly
    return "";
  }

  const dimLines = DIMENSIONS.map((d) => {
    const weight = WEIGHT_LABELS[context.dimensionWeights[d]];
    const reinterpretation = context.dimensionReinterpretations[d];
    return `- ${d.charAt(0).toUpperCase() + d.slice(1)} (${weight}): ${reinterpretation}`;
  }).join("\n");

  const audioOnlyLine = context.audioOnly
    ? "\nThis is an audio-only format. Do NOT penalise or reference visual delivery, body language, eye contact, or slides. Treat the absence of visual cues as expected, not as a shortcoming.\n"
    : "";

  return `
## ASSESSMENT CONTEXT: ${context.label}
Purpose of this presentation: ${context.successDefinition}
You are still scoring the five LearnFast dimensions on the same 0–100 scale.
Interpret each dimension for THIS context:
${dimLines}
Weighting guidance: dimensions marked "CRITICAL" should be judged most strictly and feature most prominently in written feedback. "high" dimensions warrant close attention. "standard" dimensions use the default rubric. "low" dimensions should be judged leniently and mentioned only if notably strong or weak.${audioOnlyLine}
Your written feedback MUST reference the context by name (${context.label}) and explain scores through the lens of its purpose — not generic presentation advice.

`;
}
