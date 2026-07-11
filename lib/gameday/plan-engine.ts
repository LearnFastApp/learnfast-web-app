import { classifyRunway } from "./runway.ts";
import { pickSprintTemplate, buildSprintDays } from "./sprint-templates.ts";
import { buildPhases, buildPhaseSessionSeeds, assignAdvisoryDates, type BlockBand } from "./block-schedule.ts";
import { SESSION_TYPE_LIBRARY } from "./session-types.ts";
import type { DaySpec, GeneratedPlan, PrescribedSessionSeed } from "./types.ts";

export interface GeneratePlanInput {
  eventDate: Date;
  now: Date;
  sessionsPerWeek?: number; // 2-5, default 3; block mode only
}

function flattenSprintDays(days: DaySpec[], eventDate: Date): PrescribedSessionSeed[] {
  const seeds: PrescribedSessionSeed[] = [];
  let ordinal = 0;
  for (const day of days) {
    const targetDate = new Date(eventDate.getTime() + day.dayOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const sessionType of day.sessionTypes) {
      seeds.push({
        ordinal: ordinal++,
        sessionType,
        dayIndex: day.dayOffset,
        targetDate,
        constraint: SESSION_TYPE_LIBRARY[sessionType].constraint,
      });
    }
  }
  return seeds;
}

/**
 * Orchestrates the deterministic plan-generation engine: classifies runway,
 * then dispatches to the sprint-template lookup or the block-phase builder.
 * Pure — no Firestore/Anthropic access; API routes call this and persist the
 * result via plan-version.ts's buildPlanDocument().
 */
export function generatePlan(input: GeneratePlanInput): GeneratedPlan {
  const { eventDate, now, sessionsPerWeek = 3 } = input;
  const { runwayDays, mode, band } = classifyRunway(eventDate, now);

  if (mode === "immediate") {
    // <4h out: per spec, no plan is created — client routes straight to
    // cue-card quick entry + Warm-Up. Still classified correctly for callers
    // that want to branch on it before deciding not to call this at all.
    return { mode, runwayDays, sessionSeeds: [] };
  }

  if (mode === "emergency") {
    const days = buildSprintDays("emergency");
    return { mode, runwayDays, sprintTemplateKey: "emergency", days, sessionSeeds: flattenSprintDays(days, eventDate) };
  }

  if (mode === "sprint") {
    const templateKey = pickSprintTemplate(runwayDays);
    const days = buildSprintDays(templateKey);
    return { mode, runwayDays, sprintTemplateKey: templateKey, days, sessionSeeds: flattenSprintDays(days, eventDate) };
  }

  // mode === "block"
  const phases = buildPhases(runwayDays, band as BlockBand, eventDate, sessionsPerWeek);
  const hasFoundation = phases.some((p) => p.type === "foundation");
  const sessionSeeds: PrescribedSessionSeed[] = [];
  let ordinal = 0;
  for (const phase of phases) {
    const rawSeeds = buildPhaseSessionSeeds(phase, sessionsPerWeek, { hasFoundation });
    const dated = assignAdvisoryDates(phase, rawSeeds);
    for (const seed of dated) {
      sessionSeeds.push({
        ...seed,
        ordinal: ordinal++,
        constraint: seed.constraint ?? SESSION_TYPE_LIBRARY[seed.sessionType].constraint,
      });
    }
  }
  return { mode, runwayDays, phases, sessionSeeds };
}
