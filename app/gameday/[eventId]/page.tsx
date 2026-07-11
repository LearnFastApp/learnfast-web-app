"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import { isGamedayModeEnabled } from "@/lib/feature-flags";

interface PrescribedSessionDoc {
  id: string;
  sessionType: string;
  phaseType: string | null;
  dayIndex: number | null;
  ordinal: number;
  targetDate: { seconds: number } | string | null;
  status: string;
}

interface PlanResponse {
  plan: {
    id: string;
    mode: "block" | "sprint" | "emergency" | "immediate";
    runwayDays: number;
    phases?: Array<{ type: string; startDate: string; endDate: string; sessionCount: number }>;
    days?: Array<{ dayOffset: number; focusLabel: string; sessionTypes: string[] }>;
  };
  prescribedSessions: PrescribedSessionDoc[];
  reanchored: boolean;
}

const DAY_STACK_THRESHOLD = 13;

/**
 * Phase B stub: fetches the plan and picks the correct view family by
 * DENSITY (runway <= 13 days -> day-stack, regardless of engine mode), per
 * spec §5. The actual BlockTimelineView / DayStackView components with full
 * session cards land in Phase C — this renders enough to verify the engine
 * end-to-end (correct mode, correct view family, correct session list).
 */
export default function GamedayPlanPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) notFound();

  const { eventId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("gameday");

  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/gameday/events/${eventId}/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "error");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("network");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, eventId]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center">
        <p className="text-slate-400">{t.errGeneric}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center">
        <p className="text-slate-400">…</p>
      </div>
    );
  }

  const { plan, prescribedSessions, reanchored } = data;
  const view = plan.runwayDays <= DAY_STACK_THRESHOLD ? "day-stack" : "block";

  return (
    <div className="min-h-screen bg-[#05070d] text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {plan.mode} mode · {view} view
          </p>
          <h1 className="text-2xl font-bold mt-1">{plan.runwayDays} days to Gameday</h1>
        </div>

        {reanchored && (
          <p className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 text-sm text-violet-300">
            {t.planAdjustedBanner(plan.runwayDays)}
          </p>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">
            {plan.mode === "block" ? "Phases" : "Sessions"}
          </h2>
          <ul className="space-y-2">
            {prescribedSessions
              .slice()
              .sort((a, b) => a.ordinal - b.ordinal)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1a2135] px-4 py-2.5 text-sm"
                >
                  <span className="text-white">{s.sessionType}</span>
                  <span className="text-slate-500">{s.status}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
