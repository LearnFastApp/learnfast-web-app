"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Brain,
  Loader2,
  AlertCircle,
  ChevronRight,
  Lightbulb,
  Star,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { classifyArchetype, ARCHETYPE_DEFS } from "@/lib/archetypes";
import { trackAssessmentCompleted } from "@/lib/contexts/analytics";

const DIMENSIONS = [
  "clarity",
  "energy",
  "engagement",
  "understanding",
  "connection",
] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
};

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#8b5cf6",
  energy: "#f59e0b",
  engagement: "#22d3ee",
  understanding: "#34d399",
  connection: "#f472b6",
};

const RESEARCH_BASIS: Record<Dimension, string> = {
  clarity: "Cognitive Load Theory · Sweller, 1988",
  energy: "Vocal Dynamism Research · Burgoon & Saine, 1978",
  engagement: "Narrative Transportation Theory · Green & Brock, 2000",
  understanding: "Dual Coding Theory · Paivio, 1971",
  connection: "Rapport Theory · Tickle-Degnen & Rosenthal, 1990",
};

interface AssessmentData {
  status: "queued" | "processing" | "complete" | "failed";
  scores?: Record<Dimension, number>;
  rationale?: Record<Dimension, string>;
  highlights?: Array<{
    quote: string;
    dimension: Dimension;
    type: "strength" | "opportunity";
  }>;
  tips?: Array<{ dimension: Dimension; tip: string }>;
  summary?: string;
  wordCount?: number;
  fillerWordCount?: number;
  audioDurationSeconds?: number;
  wordsPerMinute?: number;
  fileName?: string;
  error?: string;
  assessmentId?: string;
  guestToken?: string;
  contextLabelAtTime?: string;
}

function SignUpCTA({
  heading,
  subtext,
  claimToken,
  variant = "subtle",
}: {
  heading: string;
  subtext: string;
  claimToken: string;
  variant?: "subtle" | "prominent";
}) {
  const href = `/auth/login?mode=signup&claim=${claimToken}`;
  if (variant === "prominent") {
    return (
      <a
        href={href}
        className="flex items-center justify-between rounded-2xl border border-violet-500/30 bg-violet-500/[0.08] p-5 hover:bg-violet-500/[0.14] transition group"
      >
        <div>
          <p className="text-sm font-bold text-white mb-0.5">{heading}</p>
          <p className="text-xs text-slate-400">{subtext}</p>
        </div>
        <div className="ml-4 shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/20 group-hover:bg-violet-500/30 transition">
          <ArrowRight className="h-4 w-4 text-violet-400" />
        </div>
      </a>
    );
  }
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-xs text-slate-500 hover:text-violet-400 transition"
    >
      <span>{heading} — {subtext}</span>
      <ChevronRight className="h-3 w-3" />
    </a>
  );
}

export default function GuestResultsPage() {
  const { token } = useParams<{ token: string }>();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/guest-assessment/${token}`);
        if (!res.ok) {
          setAssessment({ status: "failed", error: "not_found" });
          return;
        }
        const data = (await res.json()) as AssessmentData & { contextId?: string; contextPromptVersion?: string };
        setAssessment(data);
        if (data.status === "complete") {
          trackAssessmentCompleted(data.contextId ?? "general", data.contextPromptVersion ?? "1.0.0", (data as unknown as Record<string, unknown>).userLocale as string | undefined);
        } else if (data.status !== "failed") {
          pollRef.current = setTimeout(poll, 5000);
        }
      } catch {
        pollRef.current = setTimeout(poll, 8000);
      }
    }

    poll();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [token]);

  // ── Processing ───────────────────────────────────────────────────────────────
  if (!assessment || assessment.status === "queued" || assessment.status === "processing") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative inline-flex mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Brain className="h-8 w-8 text-amber-400" />
            </div>
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-400 animate-spin" />
          </div>
          <p className="text-white font-semibold mb-2">Analysing your presentation</p>
          <p className="text-slate-400 text-sm">Transcribing audio and scoring across all five dimensions…</p>
          <p className="text-slate-600 text-xs mt-4">This usually takes 1–3 minutes</p>
        </div>
      </main>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (assessment.status === "failed") {
    const isDuration = assessment.error === "duration_exceeded";
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">
            {isDuration ? "Recording too long" : "Analysis failed"}
          </p>
          <p className="text-slate-400 text-sm mb-6">
            {isDuration
              ? "The free assessment supports recordings up to 90 seconds. Sign up free and get 3 full-length assessments every month."
              : "We couldn't process this recording. Please try again with a different file."}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/try"
              className="inline-block text-sm text-slate-400 hover:text-white transition"
            >
              ← Try another recording
            </a>
            {isDuration && (
              <a
                href={`/auth/login?mode=signup`}
                className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition"
              >
                Sign up free — unlimited length →
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  const scores = assessment.scores!;
  const sortedDims = ([...DIMENSIONS] as Dimension[]).sort(
    (a, b) => scores[a] - scores[b]
  );
  const lowestDim = sortedDims[0];
  const durationMins = assessment.audioDurationSeconds
    ? Math.round(assessment.audioDurationSeconds / 60)
    : null;

  const archetypeKey = classifyArchetype(scores, null);
  const arch = ARCHETYPE_DEFS[archetypeKey];

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: DIM_LABELS[dim],
    ai: scores[dim],
    fullMark: 100,
  }));

  const signupHref = `/auth/login?mode=signup&claim=${token}`;

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/icon-mark.png" alt="" width={24} height={17} />
            <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
              LEARN<span className="font-light">FAST</span>
            </span>
          </div>
          <a
            href={signupHref}
            className="text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition"
          >
            Save results free →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* File info + context badge */}
        {assessment.fileName && (
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm text-slate-400 truncate">{assessment.fileName}</p>
            {durationMins !== null && (
              <span className="text-slate-600 text-sm">· {durationMins} minutes</span>
            )}
            {assessment.wordsPerMinute && (
              <span className="text-slate-600 text-sm">
                · {assessment.wordsPerMinute} words/min
              </span>
            )}
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
              {assessment.contextLabelAtTime ?? "General Presentation"}
            </span>
          </div>
        )}

        {/* Summary */}
        {assessment.summary && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">
              AI Summary
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{assessment.summary}</p>
          </div>
        )}

        {/* Archetype */}
        <div className={`rounded-2xl border ${arch.borderClass} ${arch.bgClass} p-6`}>
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0 leading-none mt-0.5">{arch.emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1"
                style={{ color: arch.color }}
              >
                Presenter Archetype
              </p>
              <h3 className="text-xl font-black text-white mb-0.5">{arch.name.en}</h3>
              <p className="text-xs font-medium mb-3" style={{ color: arch.color }}>
                {arch.tagline.en}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                {arch.description.en}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">
                    Key strength
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{arch.strength.en}</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Development focus
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{arch.development.en}</p>
                </div>
              </div>
              <SignUpCTA
                heading="Track your archetype over time"
                subtext="save results free"
                claimToken={token}
              />
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Your five dimensions</h2>
          <p className="text-xs text-slate-500 mb-5">
            AI assessment across Clarity, Energy, Engagement, Understanding and Connection
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#ffffff15" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
              />
              <Radar
                name="AI Assessment"
                dataKey="ai"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
                wrapperStyle={{ paddingTop: 16 }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-5 gap-1">
            {DIMENSIONS.map((dim) => (
              <div key={dim} className="text-center">
                <p className="text-[9px] sm:text-xs text-slate-500 mb-1 leading-tight">{DIM_LABELS[dim]}</p>
                <p className="text-lg sm:text-xl font-bold" style={{ color: DIM_COLORS[dim] }}>
                  {scores[dim]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Inline CTA — after radar */}
        <SignUpCTA
          heading="Add live audience feedback to your next session"
          subtext="free account — no credit card"
          claimToken={token}
          variant="prominent"
        />

        {/* Dimension breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Dimension breakdown</h2>
          {sortedDims.map((dim) => (
            <div
              key={dim}
              className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: DIM_COLORS[dim] }}
            >
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {dim === lowestDim && (
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                      style={{ color: DIM_COLORS[dim] }}
                    >
                      Priority focus
                    </p>
                  )}
                  <h3 className="text-base font-bold text-white">{DIM_LABELS[dim]}</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    {RESEARCH_BASIS[dim]}
                  </p>
                  {assessment.rationale?.[dim] && (
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      {assessment.rationale[dim]}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-2xl font-black"
                    style={{ color: DIM_COLORS[dim] }}
                  >
                    {scores[dim]}
                  </p>
                  <p className="text-[11px] text-slate-600">/100</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key moments */}
        {assessment.highlights && assessment.highlights.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Key moments</h2>
            <div className="space-y-3">
              {assessment.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 flex items-start gap-3 ${
                    h.type === "strength"
                      ? "border-green-500/20 bg-green-500/[0.05]"
                      : "border-amber-500/20 bg-amber-500/[0.05]"
                  }`}
                >
                  {h.type === "strength" ? (
                    <Star className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-white leading-relaxed">"{h.quote}"</p>
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: DIM_COLORS[h.dimension] }}
                    >
                      {h.type === "strength" ? "Strength" : "Opportunity"} · {DIM_LABELS[h.dimension]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching tips */}
        {assessment.tips && assessment.tips.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Your next steps</h2>
            <div className="space-y-3">
              {assessment.tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-[#111827] p-4 flex items-start gap-3"
                >
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p
                      className="text-[11px] font-semibold mb-1"
                      style={{ color: DIM_COLORS[tip.dimension] }}
                    >
                      {DIM_LABELS[tip.dimension]}
                    </p>
                    <p className="text-sm text-slate-300">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vocal stats */}
        {(assessment.wordCount || assessment.fillerWordCount !== undefined) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Vocal statistics
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {durationMins !== null && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{durationMins}</p>
                  <p className="text-xs text-slate-500 mt-0.5">minutes</p>
                </div>
              )}
              {assessment.wordsPerMinute && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {assessment.wordsPerMinute}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">words/min</p>
                </div>
              )}
              {assessment.wordCount && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {assessment.wordCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">total words</p>
                </div>
              )}
              {assessment.fillerWordCount !== undefined && (
                <div className="text-center">
                  <p
                    className={`text-xl font-bold ${
                      assessment.fillerWordCount > 20
                        ? "text-red-400"
                        : assessment.fillerWordCount > 8
                        ? "text-amber-400"
                        : "text-green-400"
                    }`}
                  >
                    {assessment.fillerWordCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">filler words</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Methodology */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
            Scoring Methodology
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Scores are grounded in established communication science: Cognitive Load
            Theory (Sweller, 1988), Vocal Dynamism research (Burgoon & Saine, 1978),
            Narrative Transportation Theory (Green & Brock, 2000), Dual Coding Theory
            (Paivio, 1971), and Rapport Theory (Tickle-Degnen & Rosenthal, 1990). Most
            working professionals score between 50–70. Vocal statistics are objective
            measurements extracted from your audio.
          </p>
        </div>

        {/* Main CTA block */}
        <div
          id="signup-cta"
          className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.1] to-violet-900/[0.06] p-8 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
            This is just the beginning
          </p>
          <h2 className="text-2xl font-black text-white mb-3 leading-tight">
            Save your results and keep improving
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Create a free account to save this coaching report, track progress over
            time, collect live audience feedback at your next presentation, and get 3
            more AI assessments every month.
          </p>

          <div className="grid gap-3 max-w-sm mx-auto mb-6">
            {[
              "This report saved to your dashboard",
              "3 AI assessments per month, free",
              "Live audience feedback at any presentation",
              "Progress tracking across all sessions",
              "Learning resources matched to your lowest score",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-left">
                <span className="text-green-400 text-sm font-bold shrink-0">✓</span>
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>

          <a
            href={signupHref}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-base px-8 py-4 rounded-xl transition"
          >
            Create my free account
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-slate-600 mt-3">
            No credit card · Takes 30 seconds · Your results are automatically saved
          </p>
        </div>

        {/* Try another */}
        <div className="text-center">
          <a
            href="/try"
            className="text-sm text-slate-500 hover:text-slate-300 transition"
          >
            ← Try another recording
          </a>
        </div>
      </div>

      {/* Sticky bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.06] bg-[#05070d]/95 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {arch.emoji} You are {arch.name.en}
            </p>
            <p className="text-xs text-slate-500 truncate">
              Save your results and track progress over time
            </p>
          </div>
          <a
            href={signupHref}
            className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition whitespace-nowrap"
          >
            Save free →
          </a>
        </div>
      </div>
    </main>
  );
}
