"use client";

import { useEffect, useState, use } from "react";
import { notFound, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { db } from "@/lib/firebase";
import BlockTimelineView from "@/components/gameday/block-timeline-view";
import DayStackView from "@/components/gameday/day-stack-view";
import GamedayRoadmap from "@/components/gameday/gameday-roadmap";
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
    cueCardId?: string | null;
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
  const router = useRouter();
  const t = useTranslations("gameday");

  const [data, setData] = useState<PlanResponse | null>(null);
  const [tierMaxSeconds, setTierMaxSeconds] = useState(300);
  const [error, setError] = useState("");

  // Plain function, not a useEffect-invoked callback — called from the mount
  // effect below via its own inline IIFE (unchanged shape) and again, on
  // demand, from the skip-ahead click handler. Only the effect-body call site
  // is subject to react-hooks/set-state-in-effect; a click handler isn't.
  async function loadPlan() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/gameday/events/${eventId}/plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "error");
        return;
      }
      setData(json);
      // Cache the eventId -> planId mapping so the offline-first Warm-Up
      // screen can resolve it without a network round trip.
      try {
        localStorage.setItem(`gameday:planIdForEvent:${eventId}`, json.plan.id);
      } catch {
        // best-effort
      }
    } catch {
      setError("network");
    }
  }

  // Returns whether it actually worked — the roadmap shows an inline error
  // on false rather than silently doing nothing. On success, navigates to
  // Warm-Up so "skip ahead" visibly moves the user forward instead of just
  // flipping a background status flag they'd have to notice on their own.
  async function handleSkipAhead(): Promise<boolean> {
    if (!user) return false;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/gameday/events/${eventId}/skip-ahead`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      router.push(`/gameday/${eventId}/warmup`);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (cancelled) return;
      const status = snap.data()?.subscriptionStatus;
      setTierMaxSeconds(status === "pilot" || status === "active" ? 1200 : 300);
    });

    (async () => {
      if (cancelled) return;
      await loadPlan();
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

        <GamedayRoadmap
          eventId={eventId}
          sessions={prescribedSessions.map((s) => ({
            ordinal: s.ordinal,
            sessionType: s.sessionType,
            phaseType: s.phaseType,
            status: s.status,
          }))}
          hasCueCard={!!plan.cueCardId}
          onSkipAhead={handleSkipAhead}
        />

        <div id="session-timeline">
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
    </div>
  );
}
