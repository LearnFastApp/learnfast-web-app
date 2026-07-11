import { test } from "node:test";
import assert from "node:assert/strict";
import { rankWeakestDimensions } from "./weakest-section.ts";

const SCORES = { clarity: 90, energy: 40, engagement: 60, understanding: 85, connection: 55 };

test("rankWeakestDimensions: ranks ascending by score, default top 3", () => {
  const result = rankWeakestDimensions(SCORES);
  assert.deepEqual(
    result.rankedWeakest.map((r) => r.dimension),
    ["energy", "connection", "engagement"]
  );
});

test("rankWeakestDimensions: count is configurable", () => {
  const result = rankWeakestDimensions(SCORES, undefined, 2);
  assert.equal(result.rankedWeakest.length, 2);
  assert.deepEqual(result.rankedWeakest.map((r) => r.dimension), ["energy", "connection"]);
});

test("rankWeakestDimensions: no supporting text -> empty supportingNotes, never invents attribution", () => {
  const result = rankWeakestDimensions(SCORES);
  assert.deepEqual(result.supportingNotes, []);
});

test("rankWeakestDimensions: supporting text is surfaced honestly labeled by source, not tied to a dimension", () => {
  const result = rankWeakestDimensions(SCORES, {
    strength: "Great opening hook",
    coaching: "Slow down mid-section",
    comparison: "Better than your last take",
    nextFocus: ["Practice the transition", "Tighten the close"],
  });
  assert.deepEqual(result.supportingNotes, [
    { source: "strength", text: "Great opening hook" },
    { source: "coaching", text: "Slow down mid-section" },
    { source: "comparison", text: "Better than your last take" },
    { source: "nextFocus", text: "Practice the transition" },
    { source: "nextFocus", text: "Tighten the close" },
  ]);
});

test("rankWeakestDimensions: ties preserve stable dimension order", () => {
  const tied = { clarity: 50, energy: 50, engagement: 50, understanding: 50, connection: 50 };
  const result = rankWeakestDimensions(tied);
  assert.deepEqual(
    result.rankedWeakest.map((r) => r.dimension),
    ["clarity", "energy", "engagement"]
  );
});
