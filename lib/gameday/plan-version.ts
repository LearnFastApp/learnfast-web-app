import type { GeneratedPlan, PlanDoc } from "./types.ts";

/**
 * A plan regeneration always creates a NEW `plans` document — never mutates a
 * prior version's `phases`/`days` array in place (auditability, matching the
 * scoring-version registry philosophy). The only field ever touched on an old
 * version is `isCurrent` (flipped false in the same transaction that sets the
 * new doc's `isCurrent: true`). Callers should fetch "the current plan" via
 * `where('eventId','==',X).where('isCurrent','==',true)` — an atomic pointer
 * flip, not a `planVersion` race.
 */
export function nextPlanVersion(prevVersion: number | null): number {
  return (prevVersion ?? 0) + 1;
}

export function buildPlanDocument(
  generated: GeneratedPlan,
  opts: { eventId: string; userId: string; prevPlanVersion?: number | null }
): Omit<PlanDoc, "generatedAt"> {
  return {
    eventId: opts.eventId,
    userId: opts.userId,
    mode: generated.mode,
    runwayDays: generated.runwayDays,
    planVersion: nextPlanVersion(opts.prevPlanVersion ?? null),
    isCurrent: true,
    sprintTemplateKey: generated.sprintTemplateKey ?? null,
    phases: generated.phases,
    days: generated.days,
    cueCardId: null,
  };
}
