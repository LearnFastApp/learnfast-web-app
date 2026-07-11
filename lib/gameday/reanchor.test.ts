import { test } from "node:test";
import assert from "node:assert/strict";
import { reanchorSprintPlan, carryOverCompletedSessions } from "./reanchor.ts";
import { SPRINT_TEMPLATES } from "./sprint-templates.ts";
import type { PrescribedSessionRecord } from "./types.ts";

const NOW = new Date("2026-06-10T09:00:00.000Z");
function eventDaysOut(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

test("reanchorSprintPlan: block-mode plans are never re-anchored (ordinal roll-forward instead)", () => {
  const result = reanchorSprintPlan({
    currentPlan: { mode: "block", sprintTemplateKey: null },
    prescribedSessions: [],
    eventDate: eventDaysOut(20),
    now: NOW,
  });
  assert.equal(result.needsRegeneration, false);
});

test("reanchorSprintPlan: still within the same template's band -> no regeneration", () => {
  // Was a 7-day template; still 7 days out -> nothing has moved.
  const result = reanchorSprintPlan({
    currentPlan: { mode: "sprint", sprintTemplateKey: "7day" },
    prescribedSessions: [],
    eventDate: eventDaysOut(7),
    now: NOW,
  });
  assert.equal(result.needsRegeneration, false);
});

test("reanchorSprintPlan: missed a day, dropped from 4-day to 3-day template -> regenerates silently", () => {
  const result = reanchorSprintPlan({
    currentPlan: { mode: "sprint", sprintTemplateKey: "4day" },
    prescribedSessions: [
      { sessionType: "triage", status: "completed", ordinal: 0 },
      { sessionType: "repair", status: "completed", ordinal: 1 },
    ],
    eventDate: eventDaysOut(3), // originally 4 days out, now only 3 remain
    now: NOW,
  });
  assert.equal(result.needsRegeneration, true);
  assert.equal(result.newTemplateKey, "3day");
  assert.deepEqual(result.carryOver, [
    { sessionType: "triage", alreadyCompleted: true },
    { sessionType: "repair", alreadyCompleted: true },
  ]);
});

test("reanchorSprintPlan: runway collapsed past the sprint band entirely -> regenerates with no template key", () => {
  const result = reanchorSprintPlan({
    currentPlan: { mode: "sprint", sprintTemplateKey: "2day" },
    prescribedSessions: [],
    eventDate: eventDaysOut(1), // now emergency territory
    now: NOW,
  });
  assert.equal(result.needsRegeneration, true);
  assert.equal(result.newTemplateKey, undefined);
});

test("carryOverCompletedSessions: preserves completed triage and cue-card-producing fullrun onto the new template's matching slots", () => {
  const oldSessions: PrescribedSessionRecord[] = [
    { sessionType: "triage", status: "completed", ordinal: 0 },
    { sessionType: "repair", status: "scheduled", ordinal: 1 }, // not done — should NOT carry over
  ];
  const seeds = carryOverCompletedSessions(oldSessions, SPRINT_TEMPLATES["3day"]);
  const triageSeed = seeds.find((s) => s.sessionType === "triage");
  const repairSeed = seeds.find((s) => s.sessionType === "repair");
  assert.equal(triageSeed?.status, "completed");
  assert.equal(repairSeed?.status, undefined);
});

test("carryOverCompletedSessions: a completed type only credits ONE new slot, even if it appears twice in the template", () => {
  const oldSessions: PrescribedSessionRecord[] = [{ sessionType: "polish", status: "completed", ordinal: 0 }];
  // 5day template has "polish" appearing in two different days (day -1 and the final warmup day doesn't have polish though —
  // use 4day which also only has one polish slot; construct an explicit two-polish template to actually exercise the guard.
  const twoPolishDays = [
    { dayOffset: -1, focusLabel: "a", sessionTypes: ["polish"] as const },
    { dayOffset: 0, focusLabel: "b", sessionTypes: ["polish", "warmup"] as const },
  ];
  const seeds = carryOverCompletedSessions(oldSessions, twoPolishDays as never);
  const completedCount = seeds.filter((s) => s.status === "completed").length;
  assert.equal(completedCount, 1);
});

test("carryOverCompletedSessions: nothing completed -> no seed is marked completed", () => {
  const seeds = carryOverCompletedSessions([], SPRINT_TEMPLATES["2day"]);
  assert.ok(seeds.every((s) => s.status === undefined));
});
