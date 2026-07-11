import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRunway, computeRunwayDays } from "./runway.ts";

const NOW = new Date("2026-06-01T09:00:00.000Z");

function daysOut(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

test("computeRunwayDays: exact whole-day differences", () => {
  assert.equal(computeRunwayDays(daysOut(60), NOW), 60);
  assert.equal(computeRunwayDays(daysOut(1), NOW), 1);
  assert.equal(computeRunwayDays(NOW, NOW), 0);
});

test("computeRunwayDays: time-of-day does not shift the day count", () => {
  const eventLateInDay = new Date("2026-06-10T23:30:00.000Z");
  const nowEarlyInDay = new Date("2026-06-01T00:15:00.000Z");
  assert.equal(computeRunwayDays(eventLateInDay, nowEarlyInDay), 9);
});

// Spec's own Phase B acceptance matrix: 60/21/10/8/7/4/3/2/1 days + 2 hours.
test("classifyRunway: acceptance matrix from spec §7 Phase B", () => {
  assert.deepEqual(classifyRunway(daysOut(60), NOW), { runwayDays: 60, mode: "block", band: "56+" });
  assert.deepEqual(classifyRunway(daysOut(21), NOW), { runwayDays: 21, mode: "block", band: "14-27" });
  assert.deepEqual(classifyRunway(daysOut(10), NOW), { runwayDays: 10, mode: "block", band: "8-13" });
  assert.deepEqual(classifyRunway(daysOut(8), NOW), { runwayDays: 8, mode: "block", band: "8-13" });
  assert.deepEqual(classifyRunway(daysOut(7), NOW), { runwayDays: 7, mode: "sprint", band: "7" });
  assert.deepEqual(classifyRunway(daysOut(4), NOW), { runwayDays: 4, mode: "sprint", band: "4" });
  assert.deepEqual(classifyRunway(daysOut(3), NOW), { runwayDays: 3, mode: "sprint", band: "3" });
  assert.deepEqual(classifyRunway(daysOut(2), NOW), { runwayDays: 2, mode: "sprint", band: "2" });
  assert.deepEqual(classifyRunway(daysOut(1), NOW), { runwayDays: 1, mode: "emergency", band: "<2" });

  const twoHoursOut = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
  assert.deepEqual(classifyRunway(twoHoursOut, NOW), { runwayDays: 0, mode: "immediate", band: "<4h" });
});

test("classifyRunway: every table boundary", () => {
  assert.equal(classifyRunway(daysOut(56), NOW).band, "56+");
  assert.equal(classifyRunway(daysOut(55), NOW).band, "28-55");
  assert.equal(classifyRunway(daysOut(28), NOW).band, "28-55");
  assert.equal(classifyRunway(daysOut(27), NOW).band, "14-27");
  assert.equal(classifyRunway(daysOut(14), NOW).band, "14-27");
  assert.equal(classifyRunway(daysOut(13), NOW).band, "8-13");
  assert.equal(classifyRunway(daysOut(6), NOW).band, "5-6");
  assert.equal(classifyRunway(daysOut(5), NOW).band, "5-6");
});

test("classifyRunway: <4h check fires before day-based classification", () => {
  const threeHoursOut = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
  const result = classifyRunway(threeHoursOut, NOW);
  assert.equal(result.mode, "immediate");
  assert.equal(result.band, "<4h");
});

test("classifyRunway: exactly 4 hours out is NOT immediate (boundary is exclusive)", () => {
  const fourHoursOut = new Date(NOW.getTime() + 4 * 60 * 60 * 1000);
  const result = classifyRunway(fourHoursOut, NOW);
  assert.notEqual(result.mode, "immediate");
});
