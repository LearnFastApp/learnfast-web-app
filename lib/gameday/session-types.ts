import type { SessionConstraint, SessionType } from "./types.ts";

/**
 * The session type library (spec §2). Constraints are always advisory copy
 * shown on the session card — never verified or enforced (friction doctrine).
 * `maxRecordSeconds` reuses the existing tier-based `maxRecordSeconds`
 * mechanism as a per-session-type override, rather than a new enforced field.
 */
export const SESSION_TYPE_LIBRARY: Record<SessionType, { scored: boolean; constraint: SessionConstraint | null }> = {
  triage: { scored: true, constraint: null },
  "triage-lite": { scored: true, constraint: { maxRecordSeconds: 120 } },
  repair: { scored: true, constraint: { maxRecordSeconds: 180, noNotes: true } },
  fullrun: { scored: true, constraint: { standing: true, noNotes: true } },
  pressure: { scored: true, constraint: { noNotes: true } },
  polish: { scored: true, constraint: { maxRecordSeconds: 120 } },
  confidence: { scored: false, constraint: null },
  warmup: { scored: false, constraint: { audioOptional: true } },
  debrief: { scored: true, constraint: null },
};

/** Applies a session type's max-duration override (if any) against the user's tier-based ceiling — never higher than the tier allows. */
export function effectiveMaxRecordSeconds(tierMax: number, sessionType: SessionType): number {
  const cap = SESSION_TYPE_LIBRARY[sessionType].constraint?.maxRecordSeconds;
  return cap != null ? Math.min(tierMax, cap) : tierMax;
}
