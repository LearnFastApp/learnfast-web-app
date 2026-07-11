import { DIMENSIONS, type Dimension } from "../contexts/registry.ts";
import type { PhaseType, SessionType } from "./types.ts";

export type LensKey = PhaseType | SessionType;

const DEFAULT_ORDER: Dimension[] = [...DIMENSIONS]; // full weighting per existing Context Engine — no reorder
const STRUCTURE_FIRST: Dimension[] = ["clarity", "understanding", "engagement", "connection", "energy"];
const DELIVERY_FIRST: Dimension[] = ["energy", "engagement", "clarity", "connection", "understanding"];

/**
 * Presentation-only reorder of the same 5 already-scored dimensions per spec
 * §6 — never touches scoring, the Context Engine, or the scores themselves.
 *
 * v1 does NOT implement the spec's "suppress restructuring-type suggestions"
 * sub-feature for Taper/polish: no feedback-category tag exists anywhere in
 * the coaching output (RehearsalCoaching's strength/coaching/nextFocus are
 * untagged free text), so there is nothing to filter by category. Per the
 * spec's own escape hatch ("if it doesn't, skip this sub-feature and note
 * it"), this is intentionally unsupported rather than faked.
 */
export const DIMENSION_ORDER_BY_LENS: Record<LensKey, Dimension[]> = {
  // Foundation / triage / triage-lite / repair -> structure & content first
  foundation: STRUCTURE_FIRST,
  triage: STRUCTURE_FIRST,
  "triage-lite": STRUCTURE_FIRST,
  repair: STRUCTURE_FIRST,
  // Build / fullrun / pressure -> full weighting, natural order
  build: DEFAULT_ORDER,
  fullrun: DEFAULT_ORDER,
  pressure: DEFAULT_ORDER,
  peak: DEFAULT_ORDER,
  confidence: DEFAULT_ORDER,
  warmup: DEFAULT_ORDER, // never scored anyway; order is moot
  debrief: DEFAULT_ORDER,
  // Taper / polish -> delivery, pace, confidence first
  taper: DELIVERY_FIRST,
  polish: DELIVERY_FIRST,
};

export function getDimensionDisplayOrder(lensKey: LensKey): Dimension[] {
  return DIMENSION_ORDER_BY_LENS[lensKey] ?? DEFAULT_ORDER;
}

/** Reorders (never mutates) a scores map for display — the scores themselves are untouched. */
export function applyFeedbackLens(
  scores: Record<Dimension, number>,
  lensKey: LensKey
): Array<{ dimension: Dimension; score: number }> {
  return getDimensionDisplayOrder(lensKey).map((dimension) => ({ dimension, score: scores[dimension] }));
}
