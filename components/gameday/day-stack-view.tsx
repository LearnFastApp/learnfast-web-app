"use client";

import { useMemo } from "react";
import { useTranslations } from "@/lib/i18n";
import PrescriptionCard, { type PrescriptionCardSession } from "./prescription-card";

type DayStackSession = PrescriptionCardSession & {
  targetDate: string | null;
  dayIndex: number | null;
  phaseType: string | null;
};

interface DayGroup {
  key: string;
  focusLabel: string;
  sessions: DayStackSession[];
}

interface Props {
  days?: Array<{ dayOffset: number; focusLabel: string; sessionTypes: string[] }>;
  sessions: DayStackSession[];
  runwayDays: number;
  tierMaxSeconds: number;
}

/**
 * Day-Stack View (runway <= 13 days per spec §5, chosen by DENSITY not
 * engine mode). Deliberately zero optionality: today's card expanded, future
 * days collapsed, event card at the bottom with the countdown.
 */
export default function DayStackView({ days, sessions, runwayDays, tierMaxSeconds }: Props) {
  const t = useTranslations("gameday");

  const groups = useMemo<DayGroup[]>(() => {
    const byKey = new Map<string, DayStackSession[]>();
    for (const s of sessions) {
      const key = s.targetDate ?? "unscheduled";
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(s);
    }
    return [...byKey.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, groupSessions]) => {
        const sorted = groupSessions.slice().sort((a, b) => a.ordinal - b.ordinal);
        const dayIndex = sorted[0]?.dayIndex ?? null;
        const matchedDay = days?.find((d) => d.dayOffset === dayIndex);
        const phaseType = sorted[0]?.phaseType;
        const fallbackLabel = phaseType ? phaseType.charAt(0).toUpperCase() + phaseType.slice(1) : key;
        return { key, focusLabel: matchedDay?.focusLabel ?? fallbackLabel, sessions: sorted };
      });
  }, [sessions, days]);

  // "scheduled" is the only status still awaiting action — a skipped session
  // counts as past, same as completed, so a skip-ahead collapses these days
  // instead of leaving them stuck open forever.
  const firstIncompleteIndex = groups.findIndex((g) => g.sessions.some((s) => s.status === "scheduled"));
  const totalSessions = sessions.length;

  return (
    <div className="space-y-3">
      {groups.map((group, i) => {
        const nextSession = group.sessions.find((s) => s.status === "scheduled");
        const allDone = !nextSession;
        const isExpanded = i === firstIncompleteIndex;

        if (!isExpanded) {
          return (
            <div key={group.key} className="rounded-xl border border-white/5 bg-[#0d1220] px-4 py-3 text-sm">
              <span className={allDone ? "text-slate-600 line-through" : "text-slate-400"}>{group.focusLabel}</span>
            </div>
          );
        }

        return (
          <div key={group.key}>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{group.focusLabel}</p>
            {nextSession && (
              <PrescriptionCard
                session={nextSession}
                ordinalLabel={t.sessionOfLabel(nextSession.ordinal + 1, totalSessions)}
                phaseOrDayLabel={group.focusLabel}
                tierMaxSeconds={tierMaxSeconds}
              />
            )}
          </div>
        );
      })}

      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-violet-300">{t.gamedayFooterLabel(runwayDays)}</p>
      </div>
    </div>
  );
}
