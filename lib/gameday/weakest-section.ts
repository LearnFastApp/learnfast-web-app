import { DIMENSIONS, type Dimension } from "../contexts/registry.ts";

/**
 * Minimal shape of the free-text fields available on a completed rehearsal
 * take. Defined locally (not imported from lib/rehearsal-coaching.ts) so this
 * module stays pure — no Anthropic/Firestore imports.
 */
export interface TriageSupportingText {
  strength?: string;
  coaching?: string;
  nextFocus?: string[];
  comparison?: string | null;
}

export interface WeakestSectionResult {
  rankedWeakest: Array<{ dimension: Dimension; score: number }>;
  /** Untagged free text — there is no dimension-tagged highlight data on rehearsal
   * takes (that shape only exists in the separate ai_assessment pipeline), so these
   * are surfaced honestly as general supporting context, never as "the reason
   * dimension X scored low." */
  supportingNotes: Array<{ source: "strength" | "coaching" | "nextFocus" | "comparison"; text: string }>;
}

/**
 * Ranks the weakest-scoring dimensions from a single take's scores. Pure
 * numeric sort — no AI call needed, since the scores already exist on the
 * take. This resolves the spec's own open question in Operating Rule 4: no
 * new Anthropic call is required for triage weakest-section identification.
 */
export function rankWeakestDimensions(
  scores: Record<Dimension, number>,
  take?: TriageSupportingText,
  count = 3
): WeakestSectionResult {
  const entries = DIMENSIONS.map((dimension) => ({ dimension, score: scores[dimension] }));
  entries.sort((a, b) => a.score - b.score);
  const rankedWeakest = entries.slice(0, count);

  const supportingNotes: WeakestSectionResult["supportingNotes"] = [];
  if (take?.strength) supportingNotes.push({ source: "strength", text: take.strength });
  if (take?.coaching) supportingNotes.push({ source: "coaching", text: take.coaching });
  if (take?.comparison) supportingNotes.push({ source: "comparison", text: take.comparison });
  if (take?.nextFocus) {
    for (const text of take.nextFocus) supportingNotes.push({ source: "nextFocus", text });
  }

  return { rankedWeakest, supportingNotes };
}
