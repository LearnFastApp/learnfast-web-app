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

// Regression: Firestore's Admin SDK rejects `undefined` field values outright
// (throws on .set()) — block mode never sets `days`, sprint/emergency mode
// never sets `phases`, so this must be coalesced to null, never left as
// undefined, or every plan write in one of the two modes crashes.
test("buildPlanDocument: block mode's missing `days` is null, never undefined", () => {
  const generated: GeneratedPlan = {
    mode: "block",
    runwayDays: 60,
    phases: [{ type: "foundation", startDate: "2026-01-01", endDate: "2026-01-10", sessionCount: 4 }],
    sessionSeeds: [],
  };
  const doc = buildPlanDocument(generated, { eventId: "evt3", userId: "user3" });
  assert.equal(doc.days, null);
  assert.notEqual(doc.days, undefined);
});

test("buildPlanDocument: sprint mode's missing `phases` is null, never undefined", () => {
  const generated: GeneratedPlan = {
    mode: "sprint",
    runwayDays: 3,
    sprintTemplateKey: "3day",
    days: [],
    sessionSeeds: [],
  };
  const doc = buildPlanDocument(generated, { eventId: "evt4", userId: "user4" });
  assert.equal(doc.phases, null);
  assert.notEqual(doc.phases, undefined);
});

test("buildPlanDocument: no field is ever undefined, in either mode (what Firestore's .set() actually rejects)", () => {
  const blockPlan: GeneratedPlan = { mode: "block", runwayDays: 60, phases: [], sessionSeeds: [] };
  const sprintPlan: GeneratedPlan = { mode: "sprint", runwayDays: 3, sprintTemplateKey: "3day", days: [], sessionSeeds: [] };
  for (const generated of [blockPlan, sprintPlan]) {
    const doc = buildPlanDocument(generated, { eventId: "evt5", userId: "user5" });
    for (const [key, value] of Object.entries(doc)) {
      assert.notEqual(value, undefined, `${key} must not be undefined (generated.mode=${generated.mode})`);
    }
  }
});
