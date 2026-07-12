import type { Dimension } from "../contexts/registry.ts";

export type Mode = "block" | "sprint" | "emergency" | "immediate";
export type PhaseType = "foundation" | "build" | "taper" | "peak";
export type SessionType =
  | "triage"
  | "triage-lite"
  | "repair"
  | "fullrun"
  | "pressure"
  | "polish"
  | "confidence"
  | "warmup"
  | "debrief";
export type SessionStatus = "scheduled" | "completed" | "skipped" | "rolled";
export type EventStatus = "active" | "paused" | "completed" | "cancelled";

export interface SessionConstraint {
  maxRecordSeconds?: number;
  standing?: boolean;
  noNotes?: boolean;
  audioOptional?: boolean;
}

export interface PhaseSpec {
  type: PhaseType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  sessionCount: number;
}

export interface DaySpec {
  dayOffset: number; // offset from event day (0 = event day, -1 = day before, ...)
  focusLabel: string;
  sessionTypes: SessionType[];
}

export interface PrescribedSessionSeed {
  ordinal: number;
  sessionType: SessionType;
  phaseType?: PhaseType;
  dayIndex?: number;
  focusDimension?: Dimension | null;
  constraint?: SessionConstraint | null;
  targetDate?: string; // ISO date, advisory only — assigned by assignAdvisoryDates()
  status?: SessionStatus; // set explicitly only for carry-over seeds (see reanchor.ts); otherwise defaults to "scheduled" at persistence time
}

/** Minimal shape of a persisted prescribedSessions doc, as needed by the pure re-anchoring logic. */
export interface PrescribedSessionRecord {
  sessionType: SessionType;
  status: SessionStatus;
  ordinal: number;
  dayIndex?: number;
}

/** Defined here (not in sprint-templates.ts) so types.ts stays the dependency-free base module. */
export type SprintTemplateKey = "7day" | "6day" | "5day" | "4day" | "3day" | "2day" | "emergency";

export interface GeneratedPlan {
  mode: Mode;
  runwayDays: number;
  sprintTemplateKey?: SprintTemplateKey;
  phases?: PhaseSpec[];
  days?: DaySpec[];
  sessionSeeds: PrescribedSessionSeed[];
}

export interface PlanDoc {
  eventId: string;
  userId: string;
  mode: Mode;
  runwayDays: number;
  planVersion: number;
  isCurrent: boolean;
  sprintTemplateKey?: SprintTemplateKey | null;
  phases?: PhaseSpec[] | null;
  days?: DaySpec[] | null;
  cueCardId?: string | null;
}

export type { Dimension };
