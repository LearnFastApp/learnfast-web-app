import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFeedbackLens, getDimensionDisplayOrder, DIMENSION_ORDER_BY_LENS, type LensKey } from "./feedback-lens.ts";
import { DIMENSIONS } from "../contexts/registry.ts";
import type { PhaseType, SessionType } from "./types.ts";

const SCORES = { clarity: 90, energy: 40, engagement: 60, understanding: 85, connection: 55 };

test("applyFeedbackLens: never changes the scores, only their display order", () => {
  const reordered = applyFeedbackLens(SCORES, "taper");
  const total = reordered.reduce((sum, r) => sum + r.score, 0);
  const originalTotal = Object.values(SCORES).reduce((a, b) => a + b, 0);
  assert.equal(total, originalTotal);
  for (const { dimension, score } of reordered) {
    assert.equal(score, SCORES[dimension as keyof typeof SCORES]);
  }
});

test("foundation/triage/triage-lite/repair lead with structure & content dimensions (clarity, understanding)", () => {
  for (const lens of ["foundation", "triage", "triage-lite", "repair"] as LensKey[]) {
    const order = getDimensionDisplayOrder(lens);
    assert.deepEqual(order.slice(0, 2), ["clarity", "understanding"]);
  }
});

test("build/fullrun/pressure use the default, unreordered Context Engine weighting", () => {
  for (const lens of ["build", "fullrun", "pressure"] as LensKey[]) {
    assert.deepEqual(getDimensionDisplayOrder(lens), DIMENSIONS);
  }
});

test("taper/polish lead with delivery/pace dimensions (energy, engagement)", () => {
  for (const lens of ["taper", "polish"] as LensKey[]) {
    const order = getDimensionDisplayOrder(lens);
    assert.deepEqual(order.slice(0, 2), ["energy", "engagement"]);
  }
});

test("every PhaseType and SessionType has an entry — no silent fallback needed at runtime", () => {
  const phaseTypes: PhaseType[] = ["foundation", "build", "taper", "peak"];
  const sessionTypes: SessionType[] = [
    "triage", "triage-lite", "repair", "fullrun", "pressure", "polish", "confidence", "warmup", "debrief",
  ];
  for (const key of [...phaseTypes, ...sessionTypes]) {
    assert.ok(DIMENSION_ORDER_BY_LENS[key], key);
  }
});

test("every lens order is a permutation of all 5 dimensions — no dimension dropped or duplicated", () => {
  for (const key of Object.keys(DIMENSION_ORDER_BY_LENS) as LensKey[]) {
    const order = DIMENSION_ORDER_BY_LENS[key];
    assert.equal(order.length, 5);
    assert.deepEqual([...order].sort(), [...DIMENSIONS].sort());
  }
});
