import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPlanVersion, buildPlanDocument } from "./plan-version.ts";
import type { GeneratedPlan } from "./types.ts";

test("nextPlanVersion: null/first version starts at 1, then increments", () => {
  assert.equal(nextPlanVersion(null), 1);
  assert.equal(nextPlanVersion(1), 2);
  assert.equal(nextPlanVersion(5), 6);
});

test("buildPlanDocument: first generation is version 1, isCurrent true", () => {
  const generated: GeneratedPlan = {
    mode: "sprint",
    runwayDays: 3,
    sprintTemplateKey: "3day",
    days: [],
    sessionSeeds: [],
  };
  const doc = buildPlanDocument(generated, { eventId: "evt1", userId: "user1" });
  assert.equal(doc.planVersion, 1);
  assert.equal(doc.isCurrent, true);
  assert.equal(doc.eventId, "evt1");
  assert.equal(doc.userId, "user1");
  assert.equal(doc.mode, "sprint");
  assert.equal(doc.cueCardId, null);
});

test("buildPlanDocument: regeneration increments version and is always current", () => {
  const generated: GeneratedPlan = {
    mode: "sprint",
    runwayDays: 2,
    sprintTemplateKey: "2day",
    days: [],
    sessionSeeds: [],
  };
  const doc = buildPlanDocument(generated, { eventId: "evt1", userId: "user1", prevPlanVersion: 1 });
  assert.equal(doc.planVersion, 2);
  assert.equal(doc.isCurrent, true);
});

test("buildPlanDocument: carries phases/days/sprintTemplateKey through untouched", () => {
  const generated: GeneratedPlan = {
    mode: "block",
    runwayDays: 60,
    phases: [{ type: "foundation", startDate: "2026-01-01", endDate: "2026-01-10", sessionCount: 4 }],
    sessionSeeds: [],
  };
  const doc = buildPlanDocument(generated, { eventId: "evt2", userId: "user2" });
  assert.deepEqual(doc.phases, generated.phases);
  assert.equal(doc.sprintTemplateKey, null);
});
