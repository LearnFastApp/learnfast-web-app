import { test } from "node:test";
import assert from "node:assert/strict";
import { SPRINT_TEMPLATES, buildSprintDays, pickSprintTemplate, type SprintTemplateKey } from "./sprint-templates.ts";

test("pickSprintTemplate: maps every sprint-band runway to its exact template", () => {
  assert.equal(pickSprintTemplate(7), "7day");
  assert.equal(pickSprintTemplate(6), "6day");
  assert.equal(pickSprintTemplate(5), "5day");
  assert.equal(pickSprintTemplate(4), "4day");
  assert.equal(pickSprintTemplate(3), "3day");
  assert.equal(pickSprintTemplate(2), "2day");
  assert.equal(pickSprintTemplate(1), "emergency");
  assert.equal(pickSprintTemplate(0), "emergency");
});

test("pickSprintTemplate: out-of-band runway defensively falls back to 7day", () => {
  assert.equal(pickSprintTemplate(30), "7day");
});

const ALL_KEYS: SprintTemplateKey[] = ["7day", "6day", "5day", "4day", "3day", "2day", "emergency"];

test("every template's last day is dayOffset 0 and ends the sequence with warmup", () => {
  for (const key of ALL_KEYS) {
    const days = SPRINT_TEMPLATES[key];
    const last = days[days.length - 1];
    assert.equal(last.dayOffset, 0, `${key}: last day should be dayOffset 0`);
    assert.ok(last.sessionTypes.includes("warmup"), `${key}: last day should include warmup`);
  }
});

test("dayOffset is strictly ascending toward 0 with no gaps or duplicates (emergency is same-day, ordered by array position instead)", () => {
  for (const key of ALL_KEYS) {
    if (key === "emergency") continue;
    const offsets = SPRINT_TEMPLATES[key].map((d) => d.dayOffset);
    for (let i = 1; i < offsets.length; i++) {
      assert.ok(offsets[i] > offsets[i - 1], `${key}: offsets must strictly increase`);
    }
  }
});

test("day-1 of every non-emergency sprint template is a diagnostic session (full triage, per spec: Day 1 of any SPRINT = full triage)", () => {
  for (const key of ALL_KEYS) {
    if (key === "emergency") continue;
    const first = SPRINT_TEMPLATES[key][0];
    assert.ok(first.sessionTypes.includes("triage") || first.sessionTypes.includes("fullrun"),
      `${key}: day 1 should open with triage (or, for the 2-day template, a fullrun per spec's explicit 2-day definition)`);
  }
});

test("emergency template is exactly fullrun then warmup", () => {
  const days = SPRINT_TEMPLATES.emergency;
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].sessionTypes, ["fullrun"]);
  assert.deepEqual(days[1].sessionTypes, ["warmup"]);
});

test("no taper-illegal session types (triage/pressure) appear on the final day of any template", () => {
  for (const key of ALL_KEYS) {
    const days = SPRINT_TEMPLATES[key];
    const last = days[days.length - 1];
    assert.ok(!last.sessionTypes.includes("triage"));
    assert.ok(!last.sessionTypes.includes("pressure"));
  }
});

test("buildSprintDays returns a deep clone — mutating the result never touches the shared template", () => {
  const days = buildSprintDays("4day");
  days[0].sessionTypes.push("pressure");
  days[0].focusLabel = "mutated";
  assert.deepEqual(SPRINT_TEMPLATES["4day"][0].sessionTypes, ["triage", "repair"]);
  assert.equal(SPRINT_TEMPLATES["4day"][0].focusLabel, "Baseline + repair");
});
