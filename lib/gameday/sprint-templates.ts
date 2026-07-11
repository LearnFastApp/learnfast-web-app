import type { DaySpec, SprintTemplateKey } from "./types.ts";

export type { SprintTemplateKey };

/**
 * Fixed day-by-day templates per spec §4.2. `dayOffset` counts backward from
 * the event (0 = event day). The 6-day and 5-day tables are literal
 * "repair days merged (drop to fit)" variants of the 7-day arc — not derived
 * at runtime — per the spec's own instruction to keep this a pure data
 * lookup rather than a merge algorithm.
 */
export const SPRINT_TEMPLATES: Record<SprintTemplateKey, DaySpec[]> = {
  "7day": [
    { dayOffset: -6, focusLabel: "Baseline", sessionTypes: ["triage"] },
    { dayOffset: -5, focusLabel: "Repair — weakest area", sessionTypes: ["repair"] },
    { dayOffset: -4, focusLabel: "Repair — second weakest + confidence", sessionTypes: ["repair", "confidence"] },
    { dayOffset: -3, focusLabel: "Full run", sessionTypes: ["fullrun"] },
    { dayOffset: -2, focusLabel: "Pressure test", sessionTypes: ["pressure"] },
    { dayOffset: -1, focusLabel: "Polish + cue card", sessionTypes: ["polish"] },
    { dayOffset: 0, focusLabel: "Warm-Up — Gameday", sessionTypes: ["warmup"] },
  ],
  "6day": [
    { dayOffset: -5, focusLabel: "Baseline", sessionTypes: ["triage"] },
    { dayOffset: -4, focusLabel: "Repair — weakest area + confidence", sessionTypes: ["repair", "confidence"] },
    { dayOffset: -3, focusLabel: "Full run", sessionTypes: ["fullrun"] },
    { dayOffset: -2, focusLabel: "Pressure test", sessionTypes: ["pressure"] },
    { dayOffset: -1, focusLabel: "Polish + cue card", sessionTypes: ["polish"] },
    { dayOffset: 0, focusLabel: "Warm-Up — Gameday", sessionTypes: ["warmup"] },
  ],
  "5day": [
    { dayOffset: -4, focusLabel: "Baseline", sessionTypes: ["triage"] },
    { dayOffset: -3, focusLabel: "Repair — weakest area + confidence", sessionTypes: ["repair", "confidence"] },
    { dayOffset: -2, focusLabel: "Full run", sessionTypes: ["fullrun"] },
    { dayOffset: -1, focusLabel: "Pressure, then polish + cue card", sessionTypes: ["pressure", "polish"] },
    { dayOffset: 0, focusLabel: "Warm-Up — Gameday", sessionTypes: ["warmup"] },
  ],
  "4day": [
    { dayOffset: -3, focusLabel: "Baseline + repair", sessionTypes: ["triage", "repair"] },
    { dayOffset: -2, focusLabel: "Full run + confidence", sessionTypes: ["fullrun", "confidence"] },
    { dayOffset: -1, focusLabel: "Pressure, then polish + cue card", sessionTypes: ["pressure", "polish"] },
    { dayOffset: 0, focusLabel: "Warm-Up — Gameday", sessionTypes: ["warmup"] },
  ],
  "3day": [
    { dayOffset: -2, focusLabel: "Baseline + repair", sessionTypes: ["triage", "repair"] },
    { dayOffset: -1, focusLabel: "Full run + pressure", sessionTypes: ["fullrun", "pressure"] },
    { dayOffset: 0, focusLabel: "Polish + cue card, then Warm-Up", sessionTypes: ["polish", "warmup"] },
  ],
  "2day": [
    { dayOffset: -1, focusLabel: "Full run, cue card, repair, confidence", sessionTypes: ["fullrun", "repair", "confidence"] },
    { dayOffset: 0, focusLabel: "Polish (one line), then Warm-Up", sessionTypes: ["polish", "warmup"] },
  ],
  emergency: [
    { dayOffset: 0, focusLabel: "One full run, then cue card", sessionTypes: ["fullrun"] },
    { dayOffset: 0, focusLabel: "Warm-Up — ~30 min before Gameday", sessionTypes: ["warmup"] },
  ],
};

/** Picks the fixed template for a given sprint-band runway. Defensive fallback to "7day" for out-of-band inputs (should never be reached if the caller dispatches via classifyRunway first). */
export function pickSprintTemplate(runwayDays: number): SprintTemplateKey {
  if (runwayDays >= 7) return "7day";
  if (runwayDays === 6) return "6day";
  if (runwayDays === 5) return "5day";
  if (runwayDays === 4) return "4day";
  if (runwayDays === 3) return "3day";
  if (runwayDays === 2) return "2day";
  return "emergency";
}

/** Returns a deep clone so callers can freely mutate/annotate without touching the shared template constant. */
export function buildSprintDays(templateKey: SprintTemplateKey): DaySpec[] {
  return structuredClone(SPRINT_TEMPLATES[templateKey]);
}
