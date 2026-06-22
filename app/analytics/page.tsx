"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Tag, BarChart3, Lightbulb, AlertTriangle, Sparkles, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { generateInsights, type Insight } from "@/lib/insights";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#8b5cf6",
  engagement: "#22d3ee",
  energy: "#f59e0b",
  understanding: "#34d399",
  connection: "#f472b6",
};

interface SessionData {
  id: string;
  title: string;
  code: string;
  tags: string[];
  createdAt: Date;
  averages: Record<Dimension, number>;
  responseCount: number;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function trend(data: SessionData[], dim: Dimension): number {
  if (data.length < 2) return 0;
  return Math.round((data[data.length - 1].averages[dim] - data[0].averages[dim]) * 10) / 10;
}

function InsightCard({ insight }: { insight: Insight }) {
  const styles = {
    positive: {
      border: "border-green-500/30",
      bg: "bg-green-500/5",
      icon: <Sparkles className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />,
      titleColor: "text-green-300",
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: "text-amber-300",
    },
    neutral: {
      border: "border-white/10",
      bg: "bg-[#111827]",
      icon: <ArrowUpRight className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />,
      titleColor: "text-violet-300",
    },
  }[insight.severity];

  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-5`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div>
          <p className={`font-semibold text-sm mb-1 ${styles.titleColor}`}>{insight.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [activeDims, setActiveDims] = useState<Set<Dimension>>(new Set(DIMENSIONS));
  const [showInsights, setShowInsights] = useState(true);

  function toggleDim(dim: Dimension) {
    setActiveDims((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) { if (next.size > 1) next.delete(dim); }
      else next.add(dim);
      return next;
    });
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }

    async function load() {
      const sessSnap = await getDocs(
        query(
          collection(db, "sessions"),
          where("presenterId", "==", user!.uid),
          orderBy("createdAt", "asc")
        )
      );

      const results: SessionData[] = [];

      await Promise.all(
        sessSnap.docs.map(async (sessDoc) => {
          const data = sessDoc.data();
          const respSnap = await getDocs(
            query(collection(db, "feedback_responses"), where("sessionId", "==", sessDoc.id))
          );
          if (respSnap.empty) return;

          const responses = respSnap.docs.map((d) => d.data());
          const averages = Object.fromEntries(
            DIMENSIONS.map((dim) => [dim, avg(responses.map((r) => r[dim] ?? 0))])
          ) as Record<Dimension, number>;

          results.push({
            id: sessDoc.id,
            title: data.title ?? "Untitled",
            code: data.code,
            tags: data.tags ?? [],
            createdAt: data.createdAt?.toDate() ?? new Date(),
            averages,
            responseCount: responses.length,
          });
        })
      );

      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setSessions(results);
      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  const allTags = Array.from(new Set(sessions.flatMap((s) => s.tags)));

  const filtered = selectedTag === "all"
    ? sessions
    : sessions.filter((s) => s.tags.includes(selectedTag));

  const chartData = filtered.map((s) => ({
    name: s.title.length > 18 ? s.title.slice(0, 18) + "…" : s.title,
    date: s.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    ...s.averages,
  }));

  const overallAverages = Object.fromEntries(
    DIMENSIONS.map((dim) => [dim, avg(filtered.map((s) => s.averages[dim]))])
  ) as Record<Dimension, number>;

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    score: overallAverages[dim],
    fullMark: 100,
  }));

  const lowestDim = filtered.length
    ? (Object.entries(overallAverages) as [Dimension, number][]).reduce((a, b) => b[1] < a[1] ? b : a)[0]
    : null;

  const highestDim = filtered.length
    ? (Object.entries(overallAverages) as [Dimension, number][]).reduce((a, b) => b[1] > a[1] ? b : a)[0]
    : null;

  const totalResponses = filtered.reduce((acc, s) => acc + s.responseCount, 0);
  const insights = generateInsights(filtered);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading analytics…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-slate-400">Performance trends across your sessions.</p>
          </div>
          <a href="/" className="text-sm text-slate-400 hover:text-white">← Dashboard</a>
        </div>

        {allTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${selectedTag === "all" ? "bg-violet-500 text-white" : "border border-white/10 text-slate-400 hover:text-white"}`}
            >
              All sessions
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${selectedTag === tag ? "bg-violet-500 text-white" : "border border-white/10 text-slate-400 hover:text-white"}`}
              >
                <Tag className="h-3 w-3" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="p-6 lg:p-8 space-y-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">No sessions with feedback yet.</p>
            <p className="text-sm text-slate-600 mt-1">Create a session and collect responses to see your analytics.</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                <p className="text-sm text-slate-400 mb-1">Sessions analysed</p>
                <p className="text-3xl font-bold">{filtered.length}</p>
                <p className="text-xs text-slate-500 mt-1">{totalResponses} total responses</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                <p className="text-sm text-slate-400 mb-1">Overall average</p>
                <p className="text-3xl font-bold">{avg(Object.values(overallAverages))}</p>
                <p className="text-xs text-slate-500 mt-1">across all dimensions /100</p>
              </div>

              {highestDim && (
                <div className="rounded-2xl border border-green-500/20 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400 mb-1">Strongest area</p>
                  <p className="text-3xl font-bold text-green-400 capitalize">{highestDim}</p>
                  <p className="text-xs text-slate-500 mt-1">avg {overallAverages[highestDim]}/100</p>
                </div>
              )}

              {lowestDim && (
                <div className="rounded-2xl border border-amber-500/20 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400 mb-1">Focus area</p>
                  <p className="text-3xl font-bold text-amber-400 capitalize">{lowestDim}</p>
                  <p className="text-xs text-slate-500 mt-1">avg {overallAverages[lowestDim]}/100</p>
                </div>
              )}
            </section>

            {insights.length > 0 && (
              <section>
                <button
                  onClick={() => setShowInsights((v) => !v)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  <Lightbulb className="h-4 w-4 text-violet-400" />
                  <h2 className="text-lg font-bold">Insights</h2>
                  <span className="text-xs text-slate-500 ml-1">auto-detected from your data</span>
                  <span className="ml-2 text-xs text-slate-600 group-hover:text-slate-400 transition">
                    {showInsights ? "hide ▲" : "show ▼"}
                  </span>
                </button>
                {showInsights && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {insights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold mb-1">Performance over time</h2>
                  <p className="text-sm text-slate-400">Toggle dimensions to focus your view.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DIMENSIONS.map((dim) => {
                    const active = activeDims.has(dim);
                    return (
                      <button
                        key={dim}
                        onClick={() => toggleDim(dim)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition border"
                        style={{
                          borderColor: active ? DIM_COLORS[dim] : "rgba(255,255,255,0.1)",
                          backgroundColor: active ? `${DIM_COLORS[dim]}22` : "transparent",
                          color: active ? DIM_COLORS[dim] : "#64748b",
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: active ? DIM_COLORS[dim] : "#64748b" }}
                        />
                        {dim}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#ffffff08" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a2135", border: "1px solid #ffffff15", borderRadius: "12px" }}
                    labelStyle={{ color: "#ffffff" }}
                  />
                  {DIMENSIONS.filter((dim) => activeDims.has(dim)).map((dim) => (
                    <Line
                      key={dim}
                      type="monotone"
                      dataKey={dim}
                      stroke={DIM_COLORS[dim]}
                      strokeWidth={2}
                      dot={{ fill: DIM_COLORS[dim], r: 4 }}
                      name={dim.charAt(0).toUpperCase() + dim.slice(1)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <h2 className="text-lg font-bold mb-1">Overall profile</h2>
                <p className="text-sm text-slate-400 mb-4">Average across all filtered sessions.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 13 }} />
                    <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <h2 className="text-lg font-bold mb-4">Dimension trends</h2>
                <div className="space-y-4">
                  {DIMENSIONS.filter((dim) => activeDims.has(dim)).map((dim) => {
                    const t = trend(filtered, dim);
                    const score = overallAverages[dim];
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <div className="w-24 text-sm capitalize text-slate-300">{dim}</div>
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${score}%`, backgroundColor: DIM_COLORS[dim] }}
                          />
                        </div>
                        <div className="w-10 text-right text-sm font-bold">{score}</div>
                        <div className={`flex items-center gap-0.5 text-xs w-14 ${t > 0 ? "text-green-400" : t < 0 ? "text-red-400" : "text-slate-500"}`}>
                          {t > 0 ? <TrendingUp className="h-3 w-3" /> : t < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {t !== 0 ? `${t > 0 ? "+" : ""}${t}` : "flat"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
