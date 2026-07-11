import type { PhaseSpec, PrescribedSessionSeed, SessionType } from "./types.ts";
import { TAPER_VOLUME_FACTOR, describeTaperConstraint } from "./taper.ts";

export type BlockBand = "56+" | "28-55" | "14-27" | "8-13";

export interface BlockRatios {
  /** 0 means this band has no Foundation phase at all ("Build + Taper only"). */
  foundationPct: number;
  buildPct: number;
  /** Fixed, absolute day count — not a percentage of runway. */
  taperDays: number;
  /** Always 1 (the event day itself). */
  peakDays: number;
}

/**
 * Taper/Peak day-counts are fixed absolutes per spec (e.g. "Taper = final 7
 * days"), not scaled with runway length. Foundation/Build split whatever days
 * remain, by ratio. Where the spec gives a range ("5-7 days"), a single
 * deterministic midpoint is chosen so the engine stays pure and predictable.
 */
export const BLOCK_RATIOS_BY_BAND: Record<BlockBand, BlockRatios> = {
  "56+": { foundationPct: 40, buildPct: 40, taperDays: 7, peakDays: 1 },
  "28-55": { foundationPct: 30, buildPct: 55, taperDays: 6, peakDays: 1 },
  "14-27": { foundationPct: 0, buildPct: 100, taperDays: 5, peakDays: 1 },
  "8-13": { foundationPct: 0, buildPct: 100, taperDays: 2, peakDays: 1 },
};

const TAPER_VOLUME_MIDPOINT = (TAPER_VOLUME_FACTOR[0] + TAPER_VOLUME_FACTOR[1]) / 2;

function addDaysISO(eventDate: Date, offsetDays: number): string {
  const d = new Date(eventDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function sessionCountForSpan(days: number, sessionsPerWeek: number, volumeFactor = 1): number {
  if (days <= 0) return 0;
  return Math.max(1, Math.round((days / 7) * sessionsPerWeek * volumeFactor));
}

/**
 * Builds the phase list (Foundation? -> Build -> Taper -> Peak) for a block-mode
 * plan, walking backward from the event so every boundary lines up exactly at
 * day 0. `sessionsPerWeek` (2-5, default 3) only affects Foundation/Build —
 * Taper's volume is always ~40-50% of Build's regardless of this input.
 */
export function buildPhases(runwayDays: number, band: BlockBand, eventDate: Date, sessionsPerWeek = 3): PhaseSpec[] {
  const ratios = BLOCK_RATIOS_BY_BAND[band];
  const remainingDays = Math.max(0, runwayDays - ratios.taperDays - ratios.peakDays);
  const foundationDays =
    ratios.foundationPct > 0
      ? Math.round((remainingDays * ratios.foundationPct) / (ratios.foundationPct + ratios.buildPct))
      : 0;
  const buildDays = remainingDays - foundationDays;

  const phases: PhaseSpec[] = [];
  let offsetCursor = -(runwayDays - 1); // "today"

  if (foundationDays > 0) {
    const start = offsetCursor;
    const end = offsetCursor + foundationDays - 1;
    phases.push({
      type: "foundation",
      startDate: addDaysISO(eventDate, start),
      endDate: addDaysISO(eventDate, end),
      sessionCount: sessionCountForSpan(foundationDays, sessionsPerWeek),
    });
    offsetCursor = end + 1;
  }

  if (buildDays > 0) {
    const start = offsetCursor;
    const end = offsetCursor + buildDays - 1;
    phases.push({
      type: "build",
      startDate: addDaysISO(eventDate, start),
      endDate: addDaysISO(eventDate, end),
      sessionCount: sessionCountForSpan(buildDays, sessionsPerWeek),
    });
    offsetCursor = end + 1;
  }

  {
    const start = offsetCursor;
    const end = offsetCursor + ratios.taperDays - 1;
    phases.push({
      type: "taper",
      startDate: addDaysISO(eventDate, start),
      endDate: addDaysISO(eventDate, end),
      sessionCount: sessionCountForSpan(ratios.taperDays, sessionsPerWeek, TAPER_VOLUME_MIDPOINT),
    });
  }

  phases.push({
    type: "peak",
    startDate: addDaysISO(eventDate, 0),
    endDate: addDaysISO(eventDate, 0),
    sessionCount: 0, // the event itself — not a rehearsal slot
  });

  return phases;
}

const BUILD_ROTATION: SessionType[] = ["fullrun", "pressure", "repair"];
const FOUNDATION_ROTATION: SessionType[] = ["fullrun", "repair", "confidence"];

/**
 * Generates prescribed-session seeds for one phase. `hasFoundation` tells a
 * Build phase whether it also needs to absorb the "Day 1 of the block"
 * triage-lite slot — bands with no Foundation phase (14-27, 8-13 days) start
 * directly in Build, so Build's very first two seeds become
 * [triage-lite, triage] instead of Build's usual first seed being a lone
 * full triage. Taper and Peak are exhaustive per spec (no rotation needed).
 */
export function buildPhaseSessionSeeds(
  phase: PhaseSpec,
  sessionsPerWeek: number,
  opts: { hasFoundation: boolean } = { hasFoundation: true }
): PrescribedSessionSeed[] {
  const seeds: PrescribedSessionSeed[] = [];

  if (phase.type === "foundation") {
    for (let i = 0; i < phase.sessionCount; i++) {
      const sessionType: SessionType = i === 0 ? "triage-lite" : FOUNDATION_ROTATION[(i - 1) % FOUNDATION_ROTATION.length];
      seeds.push({ ordinal: i, sessionType, phaseType: "foundation", constraint: null });
    }
    return seeds;
  }

  if (phase.type === "build") {
    const prefix: SessionType[] = opts.hasFoundation ? ["triage"] : ["triage-lite", "triage"];
    for (let i = 0; i < prefix.length && i < phase.sessionCount; i++) {
      seeds.push({ ordinal: i, sessionType: prefix[i], phaseType: "build", constraint: null });
    }
    for (let i = prefix.length; i < phase.sessionCount; i++) {
      const rotationIndex = i - prefix.length;
      const sessionType = BUILD_ROTATION[rotationIndex % BUILD_ROTATION.length];
      const weekIndex = Math.floor(rotationIndex / Math.max(1, sessionsPerWeek));
      seeds.push({
        ordinal: i,
        sessionType,
        phaseType: "build",
        constraint: {
          maxRecordSeconds: Math.max(180, 600 - weekIndex * 60), // time caps shrink weekly
          noNotes: weekIndex >= 1, // notes removed after week 1
        },
      });
    }
    return seeds;
  }

  if (phase.type === "taper") {
    for (let i = 0; i < phase.sessionCount; i++) {
      const daysToEvent = phase.sessionCount - i; // last session is closest to the event
      const isFinal = i === phase.sessionCount - 1;
      seeds.push({
        ordinal: i,
        sessionType: isFinal ? "polish" : i % 2 === 0 ? "polish" : "confidence",
        phaseType: "taper",
        constraint: describeTaperConstraint(isFinal ? 1 : daysToEvent),
      });
    }
    return seeds;
  }

  // "peak" — the event itself, no prescribed rehearsal seeds.
  return seeds;
}

/**
 * Evenly spreads seeds' advisory `targetDate` across the phase's day range.
 * Purely a pace-setter (per spec: "targetDate is an advisory pace-setter" —
 * a session not done on its target date simply stays "next"). Does not hard-
 * enforce MAX_SESSIONS_PER_DAY; the full redistribution engine (`recompress()`)
 * that would need that guarantee is explicitly deferred to v1.1.
 */
export function assignAdvisoryDates(
  phase: PhaseSpec,
  seeds: PrescribedSessionSeed[]
): Array<PrescribedSessionSeed & { targetDate: string }> {
  if (seeds.length === 0) return [];
  const start = new Date(`${phase.startDate}T00:00:00.000Z`);
  const end = new Date(`${phase.endDate}T00:00:00.000Z`);
  const totalDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const n = seeds.length;

  return seeds.map((seed, i) => {
    const dayIndex = n === 1 ? 0 : Math.round((i * (totalDays - 1)) / (n - 1));
    const date = new Date(start.getTime() + dayIndex * 24 * 60 * 60 * 1000);
    return { ...seed, targetDate: date.toISOString().slice(0, 10) };
  });
}
