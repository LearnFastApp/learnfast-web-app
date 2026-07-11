"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { db } from "@/lib/firebase";
import BlockTimelineView from "@/components/gameday/block-timeline-view";
import DayStackView from "@/components/gameday/day-stack-view";
import type { SessionType } from "@/lib/gameday/types";

interface PrescribedSessionDoc {
  id: string;
  planId: string;
  sessionType: SessionType;
  phaseType: string | null;
  dayIndex: number | null;
  ordinal: number;
  targetDate: string | null;
  status: "scheduled" | "completed" | "skipped" | "rolled";
  focusDimension?: string | null;
  constraint?: {
    maxRecordSeconds?: number;
    standing?: boolean;
    noNotes?: boolean;
    audioOptional?: boolean;
  } | null;
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
 * View selection follows DENSITY, not engine mode (spec §5): any plan with
 * runway <= 13 days renders in the day-stack view even if the engine
 * classified it as a Sharpen block.
 */
export default function GamedayPlanPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) notFound();

  const { eventId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("gameday");

  const [data, setData] = useState<PlanResponse | null>(null);
  const [tierMaxSeconds, setTierMaxSeconds] = useState(300);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (cancelled) return;
      const status = snap.data()?.subscriptionStatus;
      setTierMaxSeconds(status === "pilot" || status === "active" ? 1200 : 300);
    });

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
  const useDayStack = plan.runwayDays <= DAY_STACK_THRESHOLD;

  return (
    <div className="min-h-screen bg-[#05070d] text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        {reanchored && (
          <p className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 text-sm text-violet-300">
            {t.planAdjustedBanner(plan.runwayDays)}
          </p>
        )}

        {useDayStack ? (
          <DayStackView
            days={plan.days}
            sessions={prescribedSessions.map((s) => ({
              id: s.id,
              planId: s.planId,
              sessionType: s.sessionType,
              ordinal: s.ordinal,
              status: s.status,
              focusDimension: s.focusDimension,
              constraint: s.constraint,
              targetDate: s.targetDate,
              dayIndex: s.dayIndex,
              phaseType: s.phaseType,
            }))}
            runwayDays={plan.runwayDays}
            tierMaxSeconds={tierMaxSeconds}
          />
        ) : (
          <BlockTimelineView
            phases={plan.phases}
            sessions={prescribedSessions.map((s) => ({
              id: s.id,
              planId: s.planId,
              sessionType: s.sessionType,
              ordinal: s.ordinal,
              status: s.status,
              focusDimension: s.focusDimension,
              constraint: s.constraint,
              phaseType: s.phaseType,
            }))}
            runwayDays={plan.runwayDays}
            tierMaxSeconds={tierMaxSeconds}
          />
        )}
      </div>
    </div>
  );
}
