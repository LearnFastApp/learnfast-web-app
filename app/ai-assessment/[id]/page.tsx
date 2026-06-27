"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Brain, Loader2, CheckCircle, AlertCircle, ChevronRight, Lightbulb, Star, TrendingUp } from "lucide-react";

const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABELS: Record<Dimension, string> = {
  clarity: "Clarity", energy: "Energy", engagement: "Engagement",
  understanding: "Understanding", connection: "Connection",
};

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#8b5cf6", energy: "#f59e0b", engagement: "#22d3ee",
  understanding: "#34d399", connection: "#f472b6",
};

interface AssessmentData {
  status: "queued" | "processing" | "complete" | "failed";
  scores?: Record<Dimension, number>;
  rationale?: Record<Dimension, string>;
  highlights?: Array<{ quote: string; dimension: Dimension; type: "strength" | "opportunity" }>;
  tips?: Array<{ dimension: Dimension; tip: string }>;
  summary?: string;
  wordCount?: number;
  fillerWordCount?: number;
  audioDurationSeconds?: number;
  wordsPerMinute?: number;
  fileName?: string;
  error?: string;
}

export default function AiAssessmentResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [audienceScores, setAudienceScores] = useState<Record<Dimension, number> | null>(null);
  const [reflectionScores, setReflectionScores] = useState<Record<Dimension, number> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for assessment status
  useEffect(() => {
    if (authLoading || !user) return;

    async function poll() {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/ai-assessment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.replace("/dashboard"); return; }
      const data = await res.json() as AssessmentData;
      setAssessment(data);
      if (data.status !== "complete" && data.status !== "failed") {
        pollRef.current = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [id, user, authLoading, router]);

  // Fetch latest session audience + reflection scores for comparison
  useEffect(() => {
    if (!user) return;

    async function fetchComparison() {
      const sessionSnap = await getDocs(
        query(
          collection(db, "sessions"),
          where("presenterId", "==", user!.uid),
          where("status", "==", "closed"),
          orderBy("createdAt", "desc"),
          limit(1)
        )
      );
      if (sessionSnap.empty) return;
      const sessionId = sessionSnap.docs[0].id;

      // Audience averages
      const respSnap = await getDocs(
        query(collection(db, "feedback_responses"), where("sessionId", "==", sessionId))
      );
      if (!respSnap.empty) {
        const responses = respSnap.docs.map((d) => d.data());
        const avgs = Object.fromEntries(
          DIMENSIONS.map((dim) => {
            const vals = responses.map((r) => r[dim] as number).filter((v) => typeof v === "number");
            return [dim, vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0];
          })
        ) as Record<Dimension, number>;
        setAudienceScores(avgs);
      }

      // Self-reflection
      const refSnap = await getDoc(doc(db, "presenter_reflections", sessionId));
      if (refSnap.exists()) {
        const r = refSnap.data();
        setReflectionScores({
          clarity: r.clarity, energy: r.energy, engagement: r.engagement,
          understanding: r.understanding, connection: r.connection,
        });
      }
    }

    fetchComparison().catch(console.error);
  }, [user]);

  if (authLoading) return null;

  // Processing state
  if (!assessment || assessment.status === "queued" || assessment.status === "processing") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
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

  if (assessment.status === "failed") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Analysis failed</p>
          <p className="text-slate-400 text-sm mb-6">We couldn't process this recording. Please try again with a different file.</p>
          <a href="/ai-assessment" className="text-violet-400 hover:text-violet-300 text-sm">← Try another recording</a>
        </div>
      </main>
    );
  }

  const scores = assessment.scores!;

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: DIM_LABELS[dim],
    ai: scores[dim],
    audience: audienceScores?.[dim] ?? null,
    reflection: reflectionScores?.[dim] ?? null,
    fullMark: 100,
  }));

  const sortedDims = ([...DIMENSIONS] as Dimension[]).sort((a, b) => scores[a] - scores[b]);
  const lowestDim = sortedDims[0];
  const durationMins = assessment.audioDurationSeconds ? Math.round(assessment.audioDurationSeconds / 60) : null;

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <a href="/ai-assessment" className="text-sm text-slate-400 hover:text-white transition">← New analysis</a>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Analysis complete</span>
          </div>
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">Dashboard →</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* File info */}
        {assessment.fileName && (
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-slate-400 truncate">{assessment.fileName}</p>
            {durationMins && <span className="text-slate-600 text-sm">· {durationMins} min</span>}
            {assessment.wordsPerMinute && (
              <span className="text-slate-600 text-sm">· {assessment.wordsPerMinute} wpm</span>
            )}
          </div>
        )}

        {/* Summary */}
        {assessment.summary && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">AI Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">{assessment.summary}</p>
          </div>
        )}

        {/* 3-Signal Radar */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Three-Signal Overview</h2>
          <p className="text-xs text-slate-500 mb-5">
            AI assessment · audience feedback · your self-reflection
            {!audienceScores && !reflectionScores && " (complete a session to add audience & reflection lines)"}
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#ffffff15" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Radar name="AI Assessment" dataKey="ai" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              {audienceScores && (
                <Radar name="Audience Feedback" dataKey="audience" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              )}
              {reflectionScores && (
                <Radar name="Self-Reflection" dataKey="reflection" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 3" />
              )}
              <Legend
                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                wrapperStyle={{ paddingTop: 16 }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Score grid */}
          <div className="mt-4 grid grid-cols-5 gap-3">
            {DIMENSIONS.map((dim) => (
              <div key={dim} className="text-center">
                <p className="text-xs text-slate-500 mb-1">{DIM_LABELS[dim]}</p>
                <p className="text-xl font-bold" style={{ color: DIM_COLORS[dim] }}>{scores[dim]}</p>
                {audienceScores && (
                  <p className="text-[10px] text-slate-600 mt-0.5">Aud: {audienceScores[dim]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Per-dimension breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Dimension breakdown</h2>
          {sortedDims.map((dim) => (
            <div
              key={dim}
              className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: DIM_COLORS[dim] }}
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: DIM_COLORS[dim] }}>
                    {dim === lowestDim ? "Priority focus" : ""}
                  </p>
                  <h3 className="text-base font-bold text-white">{DIM_LABELS[dim]}</h3>
                  {assessment.rationale?.[dim] && (
                    <p className="text-sm text-slate-400 mt-1">{assessment.rationale[dim]}</p>
                  )}
                </div>
                <div className="shrink-0 ml-4 text-right">
                  <p className="text-2xl font-black" style={{ color: DIM_COLORS[dim] }}>{scores[dim]}</p>
                  <p className="text-[11px] text-slate-600">/100</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {assessment.highlights && assessment.highlights.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Key moments</h2>
            <div className="space-y-3">
              {assessment.highlights.map((h, i) => (
                <div key={i} className={`rounded-xl border p-4 flex items-start gap-3 ${h.type === "strength" ? "border-green-500/20 bg-green-500/[0.05]" : "border-amber-500/20 bg-amber-500/[0.05]"}`}>
                  {h.type === "strength"
                    ? <Star className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    : <TrendingUp className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm text-white leading-relaxed">"{h.quote}"</p>
                    <p className="text-[11px] mt-1" style={{ color: DIM_COLORS[h.dimension] }}>
                      {h.type === "strength" ? "Strength" : "Opportunity"} · {DIM_LABELS[h.dimension]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement tips */}
        {assessment.tips && assessment.tips.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Your next steps</h2>
            <div className="space-y-3">
              {assessment.tips.map((t, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-[#111827] p-4 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: DIM_COLORS[t.dimension] }}>
                      {DIM_LABELS[t.dimension]}
                    </p>
                    <p className="text-sm text-slate-300">{t.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources CTA */}
        <a
          href={`/dashboard`}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111827] p-5 hover:bg-white/5 transition group"
        >
          <div>
            <p className="text-sm font-semibold text-white">Explore resources for {DIM_LABELS[lowestDim]}</p>
            <p className="text-xs text-slate-500 mt-0.5">Videos, podcasts, articles and live events matched to your lowest dimension</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition" />
        </a>

        {/* Vocal stats */}
        {(assessment.wordCount || assessment.fillerWordCount !== undefined) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Vocal statistics</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {durationMins && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{durationMins}</p>
                  <p className="text-xs text-slate-500 mt-0.5">minutes</p>
                </div>
              )}
              {assessment.wordsPerMinute && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{assessment.wordsPerMinute}</p>
                  <p className="text-xs text-slate-500 mt-0.5">words/min</p>
                </div>
              )}
              {assessment.wordCount && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{assessment.wordCount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">total words</p>
                </div>
              )}
              {assessment.fillerWordCount !== undefined && (
                <div className="text-center">
                  <p className={`text-xl font-bold ${assessment.fillerWordCount > 20 ? "text-red-400" : assessment.fillerWordCount > 8 ? "text-amber-400" : "text-green-400"}`}>
                    {assessment.fillerWordCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">filler words</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
