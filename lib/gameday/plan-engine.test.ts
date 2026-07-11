import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "./plan-engine.ts";

const NOW = new Date("2026-06-01T09:00:00.000Z");

function eventDaysOut(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

// Spec §7 Phase B acceptance matrix: 60/21/10/8/7/4/3/2/1 days + 2 hours each
// produce the correct plan shape.
test("generatePlan: 60 days out -> block mode, 4 phases, non-empty seeds", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(60), now: NOW });
  assert.equal(plan.mode, "block");
  assert.equal(plan.runwayDays, 60);
  assert.deepEqual(plan.phases?.map((p) => p.type), ["foundation", "build", "taper", "peak"]);
  assert.ok(plan.sessionSeeds.length > 0);
});

test("generatePlan: 21 days out -> block mode, no foundation phase", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(21), now: NOW });
  assert.equal(plan.mode, "block");
  assert.deepEqual(plan.phases?.map((p) => p.type), ["build", "taper", "peak"]);
});

test("generatePlan: 10 days out -> block mode (Sharpen band), no foundation, 2-day taper", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(10), now: NOW });
  assert.equal(plan.mode, "block");
  assert.deepEqual(plan.phases?.map((p) => p.type), ["build", "taper", "peak"]);
});

test("generatePlan: 8 days out -> block mode (Sharpen band boundary)", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(8), now: NOW });
  assert.equal(plan.mode, "block");
});

test("generatePlan: 7 days out -> sprint mode, 7-day template", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(7), now: NOW });
  assert.equal(plan.mode, "sprint");
  assert.equal(plan.sprintTemplateKey, "7day");
  assert.equal(plan.days?.length, 7);
});

test("generatePlan: 4 days out -> sprint mode, 4-day template", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(4), now: NOW });
  assert.equal(plan.mode, "sprint");
  assert.equal(plan.sprintTemplateKey, "4day");
});

test("generatePlan: 3 days out -> sprint mode, 3-day template", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(3), now: NOW });
  assert.equal(plan.mode, "sprint");
  assert.equal(plan.sprintTemplateKey, "3day");
});

test("generatePlan: 2 days out -> sprint mode, 2-day template", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(2), now: NOW });
  assert.equal(plan.mode, "sprint");
  assert.equal(plan.sprintTemplateKey, "2day");
});

test("generatePlan: 1 day out -> emergency mode", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(1), now: NOW });
  assert.equal(plan.mode, "emergency");
  assert.equal(plan.sprintTemplateKey, "emergency");
  assert.equal(plan.sessionSeeds.length, 2); // fullrun, warmup
});

test("generatePlan: 2 hours out -> immediate mode, no plan generated", () => {
  const twoHoursOut = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
  const plan = generatePlan({ eventDate: twoHoursOut, now: NOW });
  assert.equal(plan.mode, "immediate");
  assert.deepEqual(plan.sessionSeeds, []);
  assert.equal(plan.phases, undefined);
  assert.equal(plan.days, undefined);
});

test("generatePlan: sprint seeds carry advisory targetDate and per-type constraints", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(7), now: NOW });
  assert.ok(plan.sessionSeeds.every((s) => typeof s.targetDate === "string"));
  const triageSeed = plan.sessionSeeds.find((s) => s.sessionType === "triage");
  assert.ok(triageSeed);
  const polishSeed = plan.sessionSeeds.find((s) => s.sessionType === "polish");
  assert.equal(polishSeed?.constraint?.maxRecordSeconds, 120);
});

test("generatePlan: block seeds are ordinal-sequential across phases with no gaps", () => {
  const plan = generatePlan({ eventDate: eventDaysOut(60), now: NOW });
  const ordinals = plan.sessionSeeds.map((s) => s.ordinal);
  for (let i = 0; i < ordinals.length; i++) {
    assert.equal(ordinals[i], i);
  }
});

test("generatePlan: block mode respects a custom sessionsPerWeek", () => {
  const plan5 = generatePlan({ eventDate: eventDaysOut(60), now: NOW, sessionsPerWeek: 5 });
  const plan2 = generatePlan({ eventDate: eventDaysOut(60), now: NOW, sessionsPerWeek: 2 });
  assert.ok(plan5.sessionSeeds.length > plan2.sessionSeeds.length);
});
