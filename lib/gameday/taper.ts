import type { SessionConstraint, SessionType } from "./types.ts";

/** Taper invariants are hard-coded plan-generation rules — they constrain what the
 * PLAN prescribes, never what the user may freely record (friction doctrine: advise, don't enforce). */
export const TAPER_ALLOWED_SESSION_TYPES: SessionType[] = ["polish", "confidence"];

/** Taper volume is 40-50% of Build's weekly session count. */
export const TAPER_VOLUME_FACTOR = [0.4, 0.5] as const;

export const TAPER_FINAL_DAY_MAX_SECONDS = 120;

export const MAX_SESSIONS_PER_DAY = { taper: 1, other: 2 } as const;

export function isSessionTypeTaperLegal(type: SessionType): boolean {
  return TAPER_ALLOWED_SESSION_TYPES.includes(type);
}

/**
 * Advisory constraint for a taper-phase session, `daysToEvent` days out.
 * The final 24h is polish-only, capped at 2 minutes; earlier taper days carry
 * no additional constraint beyond the session-type restriction itself.
 */
export function describeTaperConstraint(daysToEvent: number): SessionConstraint | null {
  if (daysToEvent <= 1) {
    return { maxRecordSeconds: TAPER_FINAL_DAY_MAX_SECONDS };
  }
  return null;
}
