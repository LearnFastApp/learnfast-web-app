import { classifyRunway } from "./runway.ts";
import { pickSprintTemplate } from "./sprint-templates.ts";
import type { DaySpec, PlanDoc, PrescribedSessionRecord, PrescribedSessionSeed, SessionType, SprintTemplateKey } from "./types.ts";

export interface ReanchorInput {
  currentPlan: Pick<PlanDoc, "mode" | "sprintTemplateKey">;
  prescribedSessions: PrescribedSessionRecord[];
  eventDate: Date;
  now: Date;
}

export interface ReanchorResult {
  needsRegeneration: boolean;
  newTemplateKey?: SprintTemplateKey;
  carryOver: Array<{ sessionType: SessionType; alreadyCompleted: true }>;
}

/**
 * Sprint plans anchor to runway (dayOffset), not calendar dates. Call this on
 * every app open with an active sprint; if missed days moved the user past a
 * template boundary, the caller should silently regenerate onto the new
 * template (copy: "Plan adjusted — N days to Gameday" — never "you missed a
 * session," never red badges). Block mode needs no separate re-anchor
 * algorithm — its sessions are ordinal, not date-locked (an undone session
 * simply stays "next"; see block-schedule.ts).
 */
export function reanchorSprintPlan(input: ReanchorInput): ReanchorResult {
  if (input.currentPlan.mode !== "sprint") {
    return { needsRegeneration: false, carryOver: [] };
  }

  const { mode: newMode, runwayDays: newRunwayDays } = classifyRunway(input.eventDate, input.now);

  if (newMode !== "sprint") {
    // Runway has moved past the sprint band entirely (e.g. into emergency or immediate).
    return { needsRegeneration: true, carryOver: summarizeCarryOver(input.prescribedSessions) };
  }

  const newTemplateKey = pickSprintTemplate(newRunwayDays);
  if (newTemplateKey === input.currentPlan.sprintTemplateKey) {
    return { needsRegeneration: false, carryOver: [] };
  }

  return { needsRegeneration: true, newTemplateKey, carryOver: summarizeCarryOver(input.prescribedSessions) };
}

function summarizeCarryOver(sessions: PrescribedSessionRecord[]): Array<{ sessionType: SessionType; alreadyCompleted: true }> {
  return sessions.filter((s) => s.status === "completed").map((s) => ({ sessionType: s.sessionType, alreadyCompleted: true as const }));
}

/**
 * Maps already-completed session types from the old plan onto the new
 * template's matching slots, so triage results / cue card / other completed
 * work is preserved rather than re-prescribed. Each completed sessionType is
 * carried over onto at most one new slot (the first matching one) — an
 * honest, simple mapping that never over-claims completion.
 */
export function carryOverCompletedSessions(
  oldSessions: PrescribedSessionRecord[],
  newDays: DaySpec[]
): PrescribedSessionSeed[] {
  const completedTypes = new Set(oldSessions.filter((s) => s.status === "completed").map((s) => s.sessionType));
  const consumedTypes = new Set<SessionType>();
  const seeds: PrescribedSessionSeed[] = [];
  let ordinal = 0;

  for (const day of newDays) {
    for (const sessionType of day.sessionTypes) {
      const alreadyDone = completedTypes.has(sessionType) && !consumedTypes.has(sessionType);
      if (alreadyDone) consumedTypes.add(sessionType);
      seeds.push({
        ordinal: ordinal++,
        sessionType,
        dayIndex: day.dayOffset,
        status: alreadyDone ? "completed" : undefined,
      });
    }
  }

  return seeds;
}
