"use client";

import { useMemo } from "react";
import { useTranslations } from "@/lib/i18n";
import PrescriptionCard, { type PrescriptionCardSession } from "./prescription-card";

const PHASE_COLORS: Record<string, string> = {
  foundation: "bg-cyan-500/40",
  build: "bg-violet-500/40",
  taper: "bg-amber-500/40",
  peak: "bg-emerald-500/40",
};

type TimelineSession = PrescriptionCardSession & { phaseType: string | null };

interface Props {
  phases?: Array<{ type: string; startDate: string; endDate: string; sessionCount: number }>;
  sessions: TimelineSession[];
  runwayDays: number;
  tierMaxSeconds: number;
}

/**
 * Block View (runway >= 14 days per spec §5). Horizontal timeline: colour-coded
 * phase segments, sessions as dots (filled=done, open=next/scheduled,
 * pulsing=today's target). Tapping the current dot opens the session card
 * (rendered below the timeline, since it's already the "next" session).
 */
export default function BlockTimelineView({ phases = [], sessions, runwayDays, tierMaxSeconds }: Props) {
  const t = useTranslations("gameday");
  const sorted = useMemo(() => sessions.slice().sort((a, b) => a.ordinal - b.ordinal), [sessions]);
  const nextSession = sorted.find((s) => s.status !== "completed");
  const nextIndex = nextSession ? sorted.findIndex((s) => s.id === nextSession.id) : -1;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Gameday countdown</p>
        <h1 className="text-2xl font-bold text-white mt-1">{t.countdownHeader(runwayDays)}</h1>

        <div className="mt-5 flex gap-1 rounded-full overflow-hidden h-3">
          {phases.map((phase) => (
            <div key={phase.type} title={phase.type} className={`${PHASE_COLORS[phase.type] ?? "bg-slate-600/30"} flex-1`} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2">
          {sorted.map((s) => {
            const isNext = s.id === nextSession?.id;
            const isDone = s.status === "completed";
            return (
              <div
                key={s.id}
                title={s.sessionType}
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  isDone
                    ? "bg-violet-400"
                    : isNext
                      ? "bg-violet-400 animate-pulse ring-2 ring-violet-400/40"
                      : "bg-white/15"
                }`}
              />
            );
          })}
        </div>
      </div>

      {nextSession && (
        <PrescriptionCard
          session={nextSession}
          ordinalLabel={t.sessionOfLabel(nextIndex + 1, sorted.length)}
          phaseOrDayLabel={nextSession.phaseType ? nextSession.phaseType.replace(/^\w/, (c) => c.toUpperCase()) : ""}
          tierMaxSeconds={tierMaxSeconds}
        />
      )}
    </div>
  );
}
