import type { Mode } from "./types.ts";

export type RunwayBand =
  | "56+"
  | "28-55"
  | "14-27"
  | "8-13"
  | "7"
  | "5-6"
  | "4"
  | "3"
  | "2"
  | "<2"
  | "<4h";

export interface RunwayClassification {
  runwayDays: number;
  mode: Mode;
  band: RunwayBand;
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Whole-day distance from `now` to `eventDate`, normalized to UTC midnight on
 * both sides so the result is a stable integer regardless of time-of-day.
 * Callers needing a specific user timezone should pass Date objects already
 * adjusted to that timezone's calendar day before calling this function.
 */
export function computeRunwayDays(eventDate: Date, now: Date): number {
  const eventMidnightUTC = Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
  const nowMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((eventMidnightUTC - nowMidnightUTC) / MS_PER_DAY);
}

/**
 * Classifies runway into a mode + band per the spec's runway table. The
 * <4-hour "immediate" check is evaluated first and depends on `eventDate`
 * carrying a real timestamp, not just a calendar date — if the entry UI only
 * ever collects a bare date, this branch simply never fires, which is a safe
 * default (falls through to day-based classification instead).
 */
export function classifyRunway(eventDate: Date, now: Date): RunwayClassification {
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / MS_PER_HOUR;
  if (hoursUntilEvent < 4) {
    return { runwayDays: 0, mode: "immediate", band: "<4h" };
  }

  const runwayDays = computeRunwayDays(eventDate, now);

  if (runwayDays >= 56) return { runwayDays, mode: "block", band: "56+" };
  if (runwayDays >= 28) return { runwayDays, mode: "block", band: "28-55" };
  if (runwayDays >= 14) return { runwayDays, mode: "block", band: "14-27" };
  if (runwayDays >= 8) return { runwayDays, mode: "block", band: "8-13" };
  if (runwayDays === 7) return { runwayDays, mode: "sprint", band: "7" };
  if (runwayDays >= 5) return { runwayDays, mode: "sprint", band: "5-6" };
  if (runwayDays === 4) return { runwayDays, mode: "sprint", band: "4" };
  if (runwayDays === 3) return { runwayDays, mode: "sprint", band: "3" };
  if (runwayDays === 2) return { runwayDays, mode: "sprint", band: "2" };
  return { runwayDays, mode: "emergency", band: "<2" };
}
