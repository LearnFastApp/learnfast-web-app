"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import type { SessionType } from "@/lib/gameday/types";

interface RoadmapSession {
  ordinal: number;
  sessionType: SessionType;
  phaseType: string | null;
  status: "scheduled" | "completed" | "skipped" | "rolled";
}

interface Props {
  eventId: string;
  sessions: RoadmapSession[];
  hasCueCard: boolean;
  /** "I'm happy with this, skip ahead" — marks remaining scheduled sessions
   * skipped and navigates to Warm-Up. Returns false on failure so this
   * component can show an inline error instead of silently doing nothing. */
  onSkipAhead: () => Promise<boolean>;
}

const SEEN_KEY_PREFIX = "gameday:roadmapSeen:";

/**
 * Orientation, not duplication: BlockTimelineView/DayStackView already show
 * the precise phase/day breakdown for "what's my very next session" — this
 * answers the bigger question new users don't otherwise get told the answer
 * to ("what happens overall, and do I get a cue card"). Same 5-stage
 * narrative regardless of block vs. sprint mode, so it never needs its own
 * mode-specific branching.
 */
function computeCurrentStage(sessions: RoadmapSession[], hasCueCard: boolean): number {
  // A built cue card is the strongest signal of readiness there is — it's
  // generated (or regenerated) by the user's own explicit choice, any time,
  // from whatever take they've got. Once it exists, the journey has moved to
  // Event Day regardless of whether every optional rep is marked done —
  // remaining scheduled sessions stay available below, just no longer
  // gating "am I ready".
  if (hasCueCard) return 4;
  const sorted = sessions.slice().sort((a, b) => a.ordinal - b.ordinal);
  // "scheduled" is the only status that still counts as pending — both
  // "completed" and "skipped" mean the plan has moved past that session, so
  // a skip-ahead advances the roadmap exactly like finishing everything would.
  const next = sorted.find((s) => s.status === "scheduled");
  if (!next) return 3;
  if (next.sessionType === "triage" || next.sessionType === "triage-lite") return 0;
  if (next.phaseType === "taper" || next.sessionType === "polish") return 2;
  return 1;
}

export default function GamedayRoadmap({ eventId, sessions, hasCueCard, onSkipAhead }: Props) {
  const t = useTranslations("gameday");
  const current = computeCurrentStage(sessions, hasCueCard);
  const [skipping, setSkipping] = useState(false);
  const [skipFailed, setSkipFailed] = useState(false);

  async function handleSkipAhead() {
    if (skipping) return;
    setSkipping(true);
    setSkipFailed(false);
    const ok = await onSkipAhead();
    // On success the page navigates away, so there's nothing left to reset
    // here — only the failure path needs to re-enable the button.
    if (!ok) {
      setSkipping(false);
      setSkipFailed(true);
    }
  }

  // First time this event's roadmap has ever been opened on this device —
  // the stage list builds itself in instead of appearing fully-formed, same
  // one-shot localStorage pattern used for the cue card's first view.
  const [firstView] = useState(() => {
    try {
      if (localStorage.getItem(SEEN_KEY_PREFIX + eventId)) return false;
      localStorage.setItem(SEEN_KEY_PREFIX + eventId, "1");
      return true;
    } catch {
      return false;
    }
  });

  const stages = [
    { key: "baseline", label: t.roadmapBaselineLabel, desc: t.roadmapBaselineDesc },
    { key: "build", label: t.roadmapBuildLabel, desc: t.roadmapBuildDesc },
    { key: "taper", label: t.roadmapTaperLabel, desc: t.roadmapTaperDesc },
    { key: "cueCard", label: t.roadmapCueCardLabel, desc: t.roadmapCueCardDesc },
    { key: "eventDay", label: t.roadmapEventDayLabel, desc: t.roadmapEventDayDesc },
  ];
  const hasArrived = current === stages.length - 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
      <p className="text-xs uppercase tracking-wide text-slate-500">{t.roadmapEyebrow}</p>
      <h2 className="text-lg font-bold text-white mt-1">{t.roadmapHeading}</h2>
      <p className="text-sm text-slate-400 mt-1">{t.roadmapSubheading}</p>

      <div className="mt-5 space-y-3">
        {stages.map((stage, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <div
              key={stage.key}
              className={`flex gap-3 rounded-xl border p-3.5 transition ${
                isCurrent
                  ? "border-violet-500/40 bg-violet-500/10"
                  : "border-white/5 bg-transparent"
              } ${firstView ? "roadmap-stage-build-in" : ""}`}
              style={firstView ? { animationDelay: `${i * 90}ms` } : undefined}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-violet-400" />
                ) : (
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      isCurrent ? "border-violet-400 text-violet-300" : "border-white/15 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                )}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isCurrent ? "text-white" : isDone ? "text-slate-300" : "text-slate-400"}`}>
                  {stage.label}
                  {isCurrent && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-violet-400">
                      {t.roadmapYoureHereTag}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{stage.desc}</p>
                {/* Moving on to a later stage never locks an earlier one —
                    every one of these stays reachable, matching the app's
                    friction doctrine (advisory, never enforced). */}
                {isDone && i <= 2 && (
                  <a href="#session-timeline" className="text-xs font-medium text-violet-300 hover:text-violet-200 transition mt-1 inline-block">
                    {t.roadmapAdjustBelowLink}
                  </a>
                )}
                {isDone && i === 3 && (
                  <a
                    href={`/gameday/${eventId}/warmup?step=cuecard`}
                    className="text-xs font-medium text-violet-300 hover:text-violet-200 transition mt-1 inline-block"
                  >
                    {t.roadmapEditCueCardLink}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasArrived ? (
        <div className="mt-4 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-pink-500/10 p-4">
          <p className="font-bold text-white">{t.roadmapArrivalHeading}</p>
          <p className="text-sm text-slate-300 mt-1">{t.roadmapArrivalSubheading}</p>
          <a
            href={`/gameday/${eventId}/warmup`}
            className="inline-block mt-3 text-sm font-semibold text-violet-200 hover:text-white transition"
          >
            {t.roadmapGoToWarmupLink} →
          </a>
        </div>
      ) : (
        <div className="mt-4 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={handleSkipAhead}
            disabled={skipping}
            className="text-xs font-medium text-slate-500 hover:text-violet-300 transition disabled:opacity-50"
          >
            {skipping ? t.skippingAhead : t.skipAheadPrompt}
          </button>
          {skipFailed && <p className="text-xs text-red-400 mt-1.5">{t.errGeneric}</p>}
        </div>
      )}
    </div>
  );
}
