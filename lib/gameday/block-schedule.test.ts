import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPhases,
  buildPhaseSessionSeeds,
  assignAdvisoryDates,
  BLOCK_RATIOS_BY_BAND,
  type BlockBand,
} from "./block-schedule.ts";
import { isSessionTypeTaperLegal } from "./taper.ts";

const EVENT = new Date("2026-09-01T00:00:00.000Z");

function totalDaysSpanned(phases: ReturnType<typeof buildPhases>): number {
  const first = new Date(`${phases[0].startDate}T00:00:00.000Z`);
  const last = new Date(`${phases[phases.length - 1].endDate}T00:00:00.000Z`);
  return Math.round((last.getTime() - first.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

test("buildPhases: 60-day runway (56+ band) produces foundation, build, taper, peak spanning exactly 60 days", () => {
  const phases = buildPhases(60, "56+", EVENT);
  assert.deepEqual(phases.map((p) => p.type), ["foundation", "build", "taper", "peak"]);
  assert.equal(totalDaysSpanned(phases), 60);
  assert.equal(phases[phases.length - 1].endDate, "2026-09-01");
  assert.equal(phases[phases.length - 1].startDate, "2026-09-01"); // peak is a single day
  const taper = phases.find((p) => p.type === "taper")!;
  const taperSpan =
    Math.round(
      (new Date(`${taper.endDate}T00:00:00.000Z`).getTime() - new Date(`${taper.startDate}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;
  assert.equal(taperSpan, 7);
});

test("buildPhases: 14-27 band has NO foundation phase (Build + Taper only)", () => {
  const phases = buildPhases(21, "14-27", EVENT);
  assert.deepEqual(phases.map((p) => p.type), ["build", "taper", "peak"]);
  assert.equal(totalDaysSpanned(phases), 21);
});

test("buildPhases: 8-13 band (Sharpen) has no foundation, 2-day taper", () => {
  const phases = buildPhases(10, "8-13", EVENT);
  assert.deepEqual(phases.map((p) => p.type), ["build", "taper", "peak"]);
  const taper = phases.find((p) => p.type === "taper")!;
  const span =
    Math.round(
      (new Date(`${taper.endDate}T00:00:00.000Z`).getTime() - new Date(`${taper.startDate}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;
  assert.equal(span, 2);
});

test("buildPhases: phases are contiguous with no gaps or overlaps, every band", () => {
  const cases: Array<[number, BlockBand]> = [
    [60, "56+"],
    [40, "28-55"],
    [21, "14-27"],
    [10, "8-13"],
  ];
  for (const [runwayDays, band] of cases) {
    const phases = buildPhases(runwayDays, band, EVENT);
    for (let i = 1; i < phases.length; i++) {
      const prevEnd = new Date(`${phases[i - 1].endDate}T00:00:00.000Z`);
      const nextStart = new Date(`${phases[i].startDate}T00:00:00.000Z`);
      const gap = Math.round((nextStart.getTime() - prevEnd.getTime()) / (24 * 60 * 60 * 1000));
      assert.equal(gap, 1, `${band}: gap between ${phases[i - 1].type} and ${phases[i].type}`);
    }
    assert.equal(totalDaysSpanned(phases), runwayDays, `${band}: total span should equal runwayDays`);
  }
});

test("buildPhases: peak always has zero prescribed sessions (the event itself, not a rehearsal slot)", () => {
  for (const band of Object.keys(BLOCK_RATIOS_BY_BAND) as BlockBand[]) {
    const phases = buildPhases(60, band, EVENT);
    const peak = phases.find((p) => p.type === "peak")!;
    assert.equal(peak.sessionCount, 0);
  }
});

test("buildPhaseSessionSeeds: foundation day 1 is triage-lite, rest rotate fullrun/repair/confidence", () => {
  const phase = { type: "foundation" as const, startDate: "2026-01-01", endDate: "2026-01-21", sessionCount: 9 };
  const seeds = buildPhaseSessionSeeds(phase, 3);
  assert.equal(seeds[0].sessionType, "triage-lite");
  assert.ok(seeds.slice(1).every((s) => ["fullrun", "repair", "confidence"].includes(s.sessionType)));
});

test("buildPhaseSessionSeeds: build with a preceding foundation opens with exactly one full triage", () => {
  const phase = { type: "build" as const, startDate: "2026-01-01", endDate: "2026-02-01", sessionCount: 12 };
  const seeds = buildPhaseSessionSeeds(phase, 3, { hasFoundation: true });
  assert.equal(seeds[0].sessionType, "triage");
  assert.notEqual(seeds[1].sessionType, "triage");
});

test("buildPhaseSessionSeeds: build with NO foundation opens [triage-lite, triage] (absorbs day-1-of-block)", () => {
  const phase = { type: "build" as const, startDate: "2026-01-01", endDate: "2026-02-01", sessionCount: 12 };
  const seeds = buildPhaseSessionSeeds(phase, 3, { hasFoundation: false });
  assert.equal(seeds[0].sessionType, "triage-lite");
  assert.equal(seeds[1].sessionType, "triage");
});

test("buildPhaseSessionSeeds: build constraints escalate — later weeks have shorter caps and no notes", () => {
  const phase = { type: "build" as const, startDate: "2026-01-01", endDate: "2026-03-01", sessionCount: 20 };
  const seeds = buildPhaseSessionSeeds(phase, 3, { hasFoundation: true });
  const rotationSeeds = seeds.slice(1); // drop the forced triage
  const firstWeek = rotationSeeds[0];
  const laterWeek = rotationSeeds[rotationSeeds.length - 1];
  assert.ok((laterWeek.constraint?.maxRecordSeconds ?? 0) <= (firstWeek.constraint?.maxRecordSeconds ?? Infinity));
  assert.equal(firstWeek.constraint?.noNotes, false);
  assert.equal(laterWeek.constraint?.noNotes, true);
});

test("buildPhaseSessionSeeds: taper only ever produces taper-legal session types, final session is polish and capped at 2 min", () => {
  const phase = { type: "taper" as const, startDate: "2026-08-25", endDate: "2026-08-31", sessionCount: 4 };
  const seeds = buildPhaseSessionSeeds(phase, 3);
  assert.ok(seeds.every((s) => isSessionTypeTaperLegal(s.sessionType)));
  const final = seeds[seeds.length - 1];
  assert.equal(final.sessionType, "polish");
  assert.equal(final.constraint?.maxRecordSeconds, 120);
});

test("buildPhaseSessionSeeds: peak produces no seeds", () => {
  const phase = { type: "peak" as const, startDate: "2026-09-01", endDate: "2026-09-01", sessionCount: 0 };
  assert.deepEqual(buildPhaseSessionSeeds(phase, 3), []);
});

test("assignAdvisoryDates: spreads seeds across the phase's date range, first and last land on phase boundaries", () => {
  const phase = { type: "build" as const, startDate: "2026-01-01", endDate: "2026-01-15", sessionCount: 5 };
  const seeds = buildPhaseSessionSeeds(phase, 3, { hasFoundation: true });
  const dated = assignAdvisoryDates(phase, seeds);
  assert.equal(dated[0].targetDate, "2026-01-01");
  assert.equal(dated[dated.length - 1].targetDate, "2026-01-15");
  for (let i = 1; i < dated.length; i++) {
    assert.ok(dated[i].targetDate >= dated[i - 1].targetDate);
  }
});

test("assignAdvisoryDates: empty seed list returns empty", () => {
  const phase = { type: "peak" as const, startDate: "2026-09-01", endDate: "2026-09-01", sessionCount: 0 };
  assert.deepEqual(assignAdvisoryDates(phase, []), []);
});
