"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
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
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Tag, BarChart3, Lightbulb, AlertTriangle, Sparkles, ArrowUpRight, Brain, X } from "lucide-react";
import { classifyArchetype, ARCHETYPE_DEFS } from "@/lib/archetypes";
import MobileNav from "@/components/mobile-nav";
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

interface AiScoreEntry {
  sessionId: string | null;
  scores: Record<Dimension, number>;
  createdAt: Date;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function trend(data: SessionData[], dim: Dimension): number {
  if (data.length < 2) return 0;
  return Math.round((data[data.length - 1].averages[dim] - data[0].averages[dim]) * 10) / 10;
}

function ChartTooltip(props: Record<string, unknown>) {
  const { active, payload } = props as {
    active: boolean;
    payload: { name: string; value: number; color: string; payload: { xKey: string; name: string; date: string } }[];
  };
  if (!active || !payload?.length) return null;
  const { name: sessionTitle, date } = payload[0].payload;

  const audienceEntries = payload.filter((e) => !e.name.startsWith("AI "));
  const aiEntries = payload.filter((e) => e.name.startsWith("AI "));

  return (
    <div className="rounded-xl border border-white/15 bg-[#1a2135] px-4 py-3 shadow-xl min-w-[200px]">
      {sessionTitle && (
        <p className="text-xs font-semibold text-white mb-0.5 truncate max-w-[200px]">{sessionTitle}</p>
      )}
      <p className="text-[11px] text-slate-500 mb-2">{date}</p>
      {audienceEntries.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Audience</p>
          {audienceEntries.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs py-0.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 capitalize">{entry.name}:</span>
              <span className="text-white font-bold ml-auto pl-3">{entry.value}</span>
            </div>
          ))}
        </>
      )}
      {aiEntries.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1 mt-2">AI</p>
          {aiEntries.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs py-0.5">
              <span className="h-2 w-2 rounded-full shrink-0 border border-amber-500/60" style={{ backgroundColor: entry.color + "66" }} />
              <span className="text-slate-400 capitalize">{entry.name.replace("AI ", "")}:</span>
              <span className="text-amber-300 font-bold ml-auto pl-3">{entry.value}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
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
  const [aiScores, setAiScores] = useState<AiScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [activeDims, setActiveDims] = useState<Set<Dimension>>(new Set(DIMENSIONS));
  const [showInsights, setShowInsights] = useState(true);
  const [showAudience, setShowAudience] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [archetypeModalOpen, setArchetypeModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "active">("free");
  const [locale, setLocale] = useState<"en" | "fr">("en");

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

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.subscriptionStatus === "active" ||
            (data.subscriptionStatus === "pilot" && data.pilotExpiresAt?.toDate() > new Date())) {
          setSubscriptionStatus("active");
        }
        if (data.locale === "fr") setLocale("fr");
      }
    });

    async function load() {
      try {
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

        // Load AI assessments — best-effort, don't block analytics if this fails
        try {
          const aiSnap = await getDocs(
            query(collection(db, "ai_assessments"), where("presenterId", "==", user!.uid))
          );
          const aiData: AiScoreEntry[] = aiSnap.docs
            .filter((d) => {
              const data = d.data();
              return data.status === "complete" && data.scores;
            })
            .map((d) => {
              const data = d.data();
              return {
                sessionId: data.sessionId ?? null,
                scores: data.scores as Record<Dimension, number>,
                createdAt: data.createdAt?.toDate?.() ?? new Date(0),
              };
            });
          setAiScores(aiData);
        } catch {
          // AI scores unavailable — analytics still works without them
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  const allTags = Array.from(new Set(sessions.flatMap((s) => s.tags)));

  const filtered = selectedTag === "all"
    ? sessions
    : sessions.filter((s) => s.tags.includes(selectedTag));

  // Derived AI data
  const filteredIds = new Set(filtered.map((s) => s.id));
  const aiMap = Object.fromEntries(
    aiScores
      .filter((a) => a.sessionId && filteredIds.has(a.sessionId))
      .map((a) => [a.sessionId!, a.scores])
  );
  const aiInFiltered = aiScores.filter((a) => a.sessionId && filteredIds.has(a.sessionId));
  const aiAverages = Object.fromEntries(
    DIMENSIONS.map((dim) => [
      dim,
      aiInFiltered.length ? avg(aiInFiltered.map((a) => a.scores[dim] ?? 0)) : 0,
    ])
  ) as Record<Dimension, number>;
  const hasAiData = Object.keys(aiMap).length > 0;

  // Archetype from most recent AI assessment in filtered set
  const mostRecentAi = aiInFiltered.length > 0
    ? aiInFiltered.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
    : null;
  const archetype = mostRecentAi ? classifyArchetype(mostRecentAi.scores) : null;
  const archetypeDef = archetype ? ARCHETYPE_DEFS[archetype] : null;

  const chartData = filtered.map((s, i) => {
    const aiEntry = aiMap[s.id];
    return {
      xKey: String(i),
      name: s.title.length > 18 ? s.title.slice(0, 18) + "…" : s.title,
      date: s.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      ...s.averages,
      ...(aiEntry
        ? Object.fromEntries(DIMENSIONS.map((d) => [`ai_${d}`, aiEntry[d]]))
        : {}),
    };
  });

  const overallAverages = Object.fromEntries(
    DIMENSIONS.map((dim) => [dim, avg(filtered.map((s) => s.averages[dim]))])
  ) as Record<Dimension, number>;

  const lowestDim = filtered.length
    ? (Object.entries(overallAverages) as [Dimension, number][]).reduce((a, b) => b[1] < a[1] ? b : a)[0]
    : null;

  const highestDim = filtered.length
    ? (Object.entries(overallAverages) as [Dimension, number][]).reduce((a, b) => b[1] > a[1] ? b : a)[0]
    : null;

  const totalResponses = filtered.reduce((acc, s) => acc + s.responseCount, 0);
  const insights = generateInsights(filtered, locale);

  const DIM_LABELS_FR: Record<Dimension, string> = {
    clarity: "Clarté", engagement: "Engagement", energy: "Énergie",
    understanding: "Compréhension", connection: "Connexion",
  };
  const isFr = locale === "fr";
  const dimLabel = (dim: Dimension) => isFr ? DIM_LABELS_FR[dim] : dim.charAt(0).toUpperCase() + dim.slice(1);

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dimLabel(dim),
    audience: overallAverages[dim],
    ai: aiInFiltered.length > 0 ? aiAverages[dim] : undefined,
    fullMark: 100,
  }));

  const t = isFr ? {
    pageTitle: "Analytiques",
    pageSubtitle: "Tendances de performance sur vos sessions.",
    backLink: "← Tableau de bord",
    allSessions: "Toutes les sessions",
    sessionsAnalysed: "Sessions analysées",
    totalResponses: (n: number) => `${n} réponse${n !== 1 ? "s" : ""} au total`,
    overallAverage: "Moyenne globale",
    acrossDimensions: "sur toutes les dimensions /100",
    strongestArea: "Point fort",
    focusArea: "Axe d'amélioration",
    avgScore: (n: number) => `moy. ${n}/100`,
    insightsTitle: "Insights",
    insightsSubtitle: "détectés automatiquement",
    hide: "masquer ▲",
    show: "afficher ▼",
    noSessions: "Aucune session avec des retours pour l'instant.",
    noSessionsSub: "Créez une session et collectez des réponses pour voir vos analytiques.",
    perfOverTime: "Performance dans le temps",
    perfOverTimeSub: "Activez/désactivez des dimensions pour affiner votre vue.",
    overallProfile: "Profil global",
    overallProfileSub: "Moyenne sur toutes les sessions filtrées.",
    dimTrends: "Tendances par dimension",
    flat: "stable",
    liteFeature: "Fonctionnalité Lite",
    liteTitle: "Analytiques & suivi des tendances",
    liteDesc: "Visualisez l'évolution de vos scores entre sessions, détectez des tendances et prouvez votre progression dans le temps.",
    liteBtn: "Commencer l'essai de 7 jours →",
    aiAssessments: "Évaluations IA",
    audienceSignal: "Audience",
    aiSignal: "IA",
    dimTrendsAudLabel: "Aud.",
    dimTrendsAiLabel: "IA",
  } : {
    pageTitle: "Analytics",
    pageSubtitle: "Performance trends across your sessions.",
    backLink: "← Dashboard",
    allSessions: "All sessions",
    sessionsAnalysed: "Sessions analysed",
    totalResponses: (n: number) => `${n} total response${n !== 1 ? "s" : ""}`,
    overallAverage: "Overall average",
    acrossDimensions: "across all dimensions /100",
    strongestArea: "Strongest area",
    focusArea: "Focus area",
    avgScore: (n: number) => `avg ${n}/100`,
    insightsTitle: "Insights",
    insightsSubtitle: "auto-detected from your data",
    hide: "hide ▲",
    show: "show ▼",
    noSessions: "No sessions with feedback yet.",
    noSessionsSub: "Create a session and collect responses to see your analytics.",
    perfOverTime: "Performance over time",
    perfOverTimeSub: "Toggle signals and dimensions to focus your view.",
    overallProfile: "Overall profile",
    overallProfileSub: "Average across all filtered sessions.",
    dimTrends: "Dimension trends",
    flat: "flat",
    liteFeature: "Lite feature",
    liteTitle: "Analytics & trend tracking",
    liteDesc: "See how your scores move across sessions, detect patterns, and prove your improvement over time.",
    liteBtn: "Start 7-day free trial →",
    aiAssessments: "AI assessments",
    audienceSignal: "Audience",
    aiSignal: "AI",
    dimTrendsAudLabel: "Aud.",
    dimTrendsAiLabel: "AI",
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">{isFr ? "Chargement des analytiques…" : "Loading analytics…"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-20 lg:pb-0">
      <MobileNav locale={locale} />
      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
            <p className="text-sm text-slate-400">{t.pageSubtitle}</p>
          </div>
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white">{t.backLink}</a>
        </div>

        {allTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${selectedTag === "all" ? "bg-violet-500 text-white" : "border border-white/10 text-slate-400 hover:text-white"}`}
            >
              {t.allSessions}
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

      {subscriptionStatus !== "active" && (
        <div className="relative">
          <div className="p-6 lg:p-8 space-y-8 pointer-events-none select-none blur-[3px] opacity-60">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[[t.sessionsAnalysed, "—", isFr ? "réponses" : "responses"], [t.overallAverage, "—", t.acrossDimensions], [t.strongestArea, "—", isFr ? "moy. —/100" : "avg —/100"], [t.focusArea, "—", isFr ? "moy. —/100" : "avg —/100"]].map(([label, val, sub]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400 mb-1">{label}</p>
                  <p className="text-3xl font-bold">{val}</p>
                  <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </section>
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 h-64" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 h-64" />
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 h-64" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-violet-500/40 bg-[#111827]/95 p-8 text-center max-w-sm mx-4 shadow-2xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/30 mx-auto">
                <BarChart3 className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">{t.liteFeature}</p>
              <h2 className="text-xl font-bold text-white mb-2">{t.liteTitle}</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {t.liteDesc}
              </p>
              <a
                href="/pricing"
                className="block w-full rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition text-center"
              >
                {t.liteBtn}
              </a>
            </div>
          </div>
        </div>
      )}

      {subscriptionStatus === "active" && <div className="p-6 lg:p-8 space-y-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">{t.noSessions}</p>
            <p className="text-sm text-slate-600 mt-1">{t.noSessionsSub}</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                <p className="text-sm text-slate-400 mb-1">{t.sessionsAnalysed}</p>
                <p className="text-3xl font-bold">{filtered.length}</p>
                <p className="text-xs text-slate-500 mt-1">{t.totalResponses(totalResponses)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                <p className="text-sm text-slate-400 mb-1">{t.overallAverage}</p>
                <p className="text-3xl font-bold">{avg(Object.values(overallAverages))}</p>
                <p className="text-xs text-slate-500 mt-1">{t.acrossDimensions}</p>
              </div>

              {highestDim && (
                <div className="rounded-2xl border border-green-500/20 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400 mb-1">{t.strongestArea}</p>
                  <p className="text-3xl font-bold text-green-400">{dimLabel(highestDim)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.avgScore(overallAverages[highestDim])}</p>
                </div>
              )}

              {lowestDim && (
                <div className="rounded-2xl border border-amber-500/20 bg-[#111827] p-5">
                  <p className="text-sm text-slate-400 mb-1">{t.focusArea}</p>
                  <p className="text-3xl font-bold text-amber-400">{dimLabel(lowestDim)}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.avgScore(overallAverages[lowestDim])}</p>
                </div>
              )}
            </section>

            {/* AI assessment count pill (only if AI data exists) */}
            {aiScores.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2">
                  <Brain className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-amber-300">
                    {aiScores.length} {t.aiAssessments}
                    {hasAiData && ` · ${Object.keys(aiMap).length} ${isFr ? "liés aux sessions filtrées" : "linked to filtered sessions"}`}
                  </span>
                </div>
              </div>
            )}

            {insights.length > 0 && (
              <section>
                <button
                  onClick={() => setShowInsights((v) => !v)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  <Lightbulb className="h-4 w-4 text-violet-400" />
                  <h2 className="text-lg font-bold">{t.insightsTitle}</h2>
                  <span className="text-xs text-slate-500 ml-1">{t.insightsSubtitle}</span>
                  <span className="ml-2 text-xs text-slate-600 group-hover:text-slate-400 transition">
                    {showInsights ? t.hide : t.show}
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

            {/* Performance over time chart */}
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold mb-1">{t.perfOverTime}</h2>
                  <p className="text-sm text-slate-400 mb-3">{t.perfOverTimeSub}</p>
                  {/* Signal toggles */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAudience((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                        showAudience
                          ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                          : "border-white/10 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                      {t.audienceSignal}
                    </button>
                    {hasAiData && (
                      <button
                        onClick={() => setShowAi((v) => !v)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                          showAi
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                            : "border-white/10 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        {t.aiSignal}
                      </button>
                    )}
                  </div>
                </div>
                {/* Dimension toggles */}
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
                        {dimLabel(dim)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#ffffff08" />
                  <XAxis
                    dataKey="xKey"
                    ticks={chartData.map((d) => d.xKey)}
                    tickFormatter={(val: string) => chartData[Number(val)]?.date ?? val}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip content={ChartTooltip} />
                  {/* Audience lines */}
                  {showAudience && DIMENSIONS.filter((dim) => activeDims.has(dim)).map((dim) => (
                    <Line
                      key={dim}
                      type="linear"
                      dataKey={dim}
                      stroke={DIM_COLORS[dim]}
                      strokeWidth={2}
                      dot={{ fill: DIM_COLORS[dim], r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: DIM_COLORS[dim], stroke: "#111827", strokeWidth: 2 }}
                      name={dimLabel(dim)}
                    />
                  ))}
                  {/* AI lines — dashed, same color */}
                  {showAi && hasAiData && DIMENSIONS.filter((dim) => activeDims.has(dim)).map((dim) => (
                    <Line
                      key={`ai_${dim}`}
                      type="linear"
                      dataKey={`ai_${dim}`}
                      stroke={DIM_COLORS[dim]}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={{ fill: DIM_COLORS[dim], r: 3, strokeWidth: 1, stroke: "#111827" }}
                      activeDot={{ r: 6, fill: DIM_COLORS[dim], stroke: "#111827", strokeWidth: 2 }}
                      name={`AI ${dimLabel(dim)}`}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {/* Chart legend */}
              {hasAiData && (
                <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 bg-violet-500 rounded" />
                    <span>{t.audienceSignal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-violet-500 opacity-70" style={{ borderTopColor: "#a78bfa" }} />
                    <span>{t.aiSignal} {isFr ? "(pointillé)" : "(dashed)"}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              {/* Overall profile radar */}
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="text-lg font-bold">{t.overallProfile}</h2>
                  {archetypeDef && (
                    <button
                      onClick={() => setArchetypeModalOpen(true)}
                      className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-1.5 transition hover:opacity-80 active:scale-95 ${archetypeDef.borderClass} ${archetypeDef.bgClass}`}
                    >
                      <span className="text-base leading-none">{archetypeDef.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: archetypeDef.color }}>
                        {archetypeDef.name[locale]}
                      </span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-4">{t.overallProfileSub}</p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 13 }} />
                    <Radar dataKey="audience" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} name={t.audienceSignal} />
                    {aiInFiltered.length > 0 && (
                      <Radar dataKey="ai" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={1.5} name={t.aiSignal} />
                    )}
                  </RadarChart>
                </ResponsiveContainer>
                {aiInFiltered.length > 0 && (
                  <div className="flex items-center justify-center gap-5 mt-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                      <span>{t.audienceSignal}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{t.aiSignal}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dimension trends */}
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <h2 className="text-lg font-bold mb-4">{t.dimTrends}</h2>

                {/* Column header */}
                {aiInFiltered.length > 0 && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-24" />
                    <div className="flex-1" />
                    <div className="w-10 text-right text-[10px] text-slate-600 font-semibold">{t.dimTrendsAudLabel}</div>
                    <div className="w-10 text-right text-[10px] text-amber-700 font-semibold">{t.dimTrendsAiLabel}</div>
                    <div className="w-14" />
                  </div>
                )}

                <div className="space-y-4">
                  {DIMENSIONS.filter((dim) => activeDims.has(dim)).map((dim) => {
                    const trendVal = trend(filtered, dim);
                    const score = overallAverages[dim];
                    const aiScore = aiInFiltered.length > 0 ? aiAverages[dim] : null;
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-slate-300">{dimLabel(dim)}</div>
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${score}%`, backgroundColor: DIM_COLORS[dim] }}
                          />
                        </div>
                        <div className="w-10 text-right text-sm font-bold">{score}</div>
                        {aiScore !== null && (
                          <div className="w-10 text-right text-sm font-bold text-amber-400">{aiScore}</div>
                        )}
                        <div className={`flex items-center gap-0.5 text-xs w-14 ${trendVal > 0 ? "text-green-400" : trendVal < 0 ? "text-red-400" : "text-slate-500"}`}>
                          {trendVal > 0 ? <TrendingUp className="h-3 w-3" /> : trendVal < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {trendVal !== 0 ? `${trendVal > 0 ? "+" : ""}${trendVal}` : t.flat}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>}

      {/* Archetype modal */}
      {archetypeModalOpen && archetypeDef && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setArchetypeModalOpen(false)}
        >
          <div
            className={`relative w-full max-w-md rounded-2xl border ${archetypeDef.borderClass} ${archetypeDef.bgClass} bg-[#111827] p-7 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setArchetypeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl leading-none">{archetypeDef.emoji}</span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5" style={{ color: archetypeDef.color }}>
                  {isFr ? "Profil de présentateur" : "Presenter Archetype"}
                </p>
                <h3 className="text-xl font-black text-white">{archetypeDef.name[locale]}</h3>
              </div>
            </div>

            <p className="text-xs font-semibold mb-3" style={{ color: archetypeDef.color }}>
              {archetypeDef.tagline[locale]}
            </p>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              {archetypeDef.description[locale]}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">
                  {isFr ? "Point fort" : "Key strength"}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{archetypeDef.strength[locale]}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  {isFr ? "Axe de développement" : "Development focus"}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{archetypeDef.development[locale]}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 mt-4 text-center">
              {isFr
                ? "Basé sur votre évaluation IA la plus récente"
                : "Based on your most recent AI assessment"}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
