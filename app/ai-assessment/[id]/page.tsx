"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Brain, Loader2, CheckCircle, AlertCircle, ChevronRight, Lightbulb, Star, TrendingUp } from "lucide-react";
import { classifyArchetype, ARCHETYPE_DEFS } from "@/lib/archetypes";

const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABELS_EN: Record<Dimension, string> = {
  clarity: "Clarity", energy: "Energy", engagement: "Engagement",
  understanding: "Understanding", connection: "Connection",
};
const DIM_LABELS_FR: Record<Dimension, string> = {
  clarity: "Clarté", energy: "Énergie", engagement: "Engagement",
  understanding: "Compréhension", connection: "Connexion",
};

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#8b5cf6", energy: "#f59e0b", engagement: "#22d3ee",
  understanding: "#34d399", connection: "#f472b6",
};

const STRINGS = {
  en: {
    navBack: "← New analysis",
    navComplete: "Analysis complete",
    navDash: "Dashboard →",
    processing: "Analysing your presentation",
    processingDesc: "Transcribing audio and scoring across all five dimensions…",
    processingTime: "This usually takes 1–3 minutes",
    failed: "Analysis failed",
    failedDesc: "We couldn't process this recording. Please try again with a different file.",
    tryAgain: "← Try another recording",
    summary: "AI Summary",
    radarTitle: "Three-Signal Overview",
    radarSub: "AI assessment · audience feedback · your self-reflection",
    radarNoData: "(complete a session to add audience & reflection lines)",
    aiLegend: "AI Assessment",
    audLegend: "Audience Feedback",
    refLegend: "Self-Reflection",
    audPrefix: "Aud:",
    breakdownTitle: "Dimension breakdown",
    priorityLabel: "Priority focus",
    momentsTitle: "Key moments",
    strength: "Strength",
    opportunity: "Opportunity",
    nextTitle: "Your next steps",
    resourcesPrefix: "Explore resources for",
    resourcesDesc: "Videos, podcasts, articles and live events matched to your lowest dimension",
    vocalTitle: "Vocal statistics",
    minutes: "minutes",
    wpm: "words/min",
    totalWords: "total words",
    fillerWords: "filler words",
    archetypeLabel: "Presenter Archetype",
    archetypeStrength: "Key strength",
    archetypeDevelopment: "Development focus",
  },
  fr: {
    navBack: "← Nouvelle analyse",
    navComplete: "Analyse terminée",
    navDash: "Tableau de bord →",
    processing: "Analyse de votre présentation",
    processingDesc: "Transcription de l'audio et évaluation sur les cinq dimensions…",
    processingTime: "Cela prend généralement 1–3 minutes",
    failed: "Échec de l'analyse",
    failedDesc: "Nous n'avons pas pu traiter cet enregistrement. Veuillez réessayer avec un autre fichier.",
    tryAgain: "← Essayer un autre enregistrement",
    summary: "Synthèse IA",
    radarTitle: "Vue d'ensemble trois signaux",
    radarSub: "Évaluation IA · retours du public · votre auto-réflexion",
    radarNoData: "(complétez une session pour ajouter les courbes public et réflexion)",
    aiLegend: "Évaluation IA",
    audLegend: "Retours du public",
    refLegend: "Auto-réflexion",
    audPrefix: "Pub :",
    breakdownTitle: "Détail par dimension",
    priorityLabel: "Priorité",
    momentsTitle: "Moments clés",
    strength: "Point fort",
    opportunity: "Axe d'amélioration",
    nextTitle: "Vos prochaines étapes",
    resourcesPrefix: "Explorer les ressources pour",
    resourcesDesc: "Vidéos, podcasts, articles et événements correspondant à votre dimension la plus faible",
    vocalTitle: "Statistiques vocales",
    minutes: "minutes",
    wpm: "mots/min",
    totalWords: "mots au total",
    fillerWords: "mots de remplissage",
    archetypeLabel: "Profil de présentateur",
    archetypeStrength: "Point fort",
    archetypeDevelopment: "Axe de développement",
  },
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
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch presenter locale
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().locale === "fr") setLocale("fr");
    }).catch(() => {});
  }, [user]);

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

  const s = STRINGS[locale];
  const DIM_LABELS = locale === "fr" ? DIM_LABELS_FR : DIM_LABELS_EN;

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
          <p className="text-white font-semibold mb-2">{s.processing}</p>
          <p className="text-slate-400 text-sm">{s.processingDesc}</p>
          <p className="text-slate-600 text-xs mt-4">{s.processingTime}</p>
        </div>
      </main>
    );
  }

  if (assessment.status === "failed") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">{s.failed}</p>
          <p className="text-slate-400 text-sm mb-6">{s.failedDesc}</p>
          <a href="/ai-assessment" className="text-violet-400 hover:text-violet-300 text-sm">{s.tryAgain}</a>
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
          <a href="/ai-assessment" className="text-sm text-slate-400 hover:text-white transition">{s.navBack}</a>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-white">{s.navComplete}</span>
          </div>
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">{s.navDash}</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* File info */}
        {assessment.fileName && (
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-slate-400 truncate">{assessment.fileName}</p>
            {durationMins && <span className="text-slate-600 text-sm">· {durationMins} {s.minutes}</span>}
            {assessment.wordsPerMinute && (
              <span className="text-slate-600 text-sm">· {assessment.wordsPerMinute} {s.wpm}</span>
            )}
          </div>
        )}

        {/* Summary */}
        {assessment.summary && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">{s.summary}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{assessment.summary}</p>
          </div>
        )}

        {/* Presenter Archetype */}
        {(() => {
          const archetypeKey = classifyArchetype(scores, reflectionScores);
          const arch = ARCHETYPE_DEFS[archetypeKey];
          return (
            <div className={`rounded-2xl border ${arch.borderClass} ${arch.bgClass} p-6`}>
              <div className="flex items-start gap-4">
                <span className="text-4xl shrink-0 leading-none mt-0.5">{arch.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: arch.color }}>
                    {s.archetypeLabel}
                  </p>
                  <h3 className="text-xl font-black text-white mb-0.5">{arch.name[locale]}</h3>
                  <p className="text-xs font-medium mb-3" style={{ color: arch.color }}>{arch.tagline[locale]}</p>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">{arch.description[locale]}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">{s.archetypeStrength}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{arch.strength[locale]}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">{s.archetypeDevelopment}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{arch.development[locale]}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3-Signal Radar */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-white mb-1">{s.radarTitle}</h2>
          <p className="text-xs text-slate-500 mb-5">
            {s.radarSub}
            {!audienceScores && !reflectionScores && ` ${s.radarNoData}`}
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#ffffff15" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Radar name={s.aiLegend} dataKey="ai" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              {audienceScores && (
                <Radar name={s.audLegend} dataKey="audience" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              )}
              {reflectionScores && (
                <Radar name={s.refLegend} dataKey="reflection" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 3" />
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
                  <p className="text-[10px] text-slate-600 mt-0.5">{s.audPrefix} {audienceScores[dim]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Per-dimension breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{s.breakdownTitle}</h2>
          {sortedDims.map((dim) => (
            <div
              key={dim}
              className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: DIM_COLORS[dim] }}
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: DIM_COLORS[dim] }}>
                    {dim === lowestDim ? s.priorityLabel : ""}
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
            <h2 className="text-lg font-bold mb-4">{s.momentsTitle}</h2>
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
                      {h.type === "strength" ? s.strength : s.opportunity} · {DIM_LABELS[h.dimension]}
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
            <h2 className="text-lg font-bold mb-4">{s.nextTitle}</h2>
            <div className="space-y-3">
              {assessment.tips.map((tip, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-[#111827] p-4 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: DIM_COLORS[tip.dimension] }}>
                      {DIM_LABELS[tip.dimension]}
                    </p>
                    <p className="text-sm text-slate-300">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources CTA */}
        <a
          href="/dashboard"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111827] p-5 hover:bg-white/5 transition group"
        >
          <div>
            <p className="text-sm font-semibold text-white">{s.resourcesPrefix} {DIM_LABELS[lowestDim]}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.resourcesDesc}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition" />
        </a>

        {/* Vocal stats */}
        {(assessment.wordCount || assessment.fillerWordCount !== undefined) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">{s.vocalTitle}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {durationMins && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{durationMins}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.minutes}</p>
                </div>
              )}
              {assessment.wordsPerMinute && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{assessment.wordsPerMinute}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.wpm}</p>
                </div>
              )}
              {assessment.wordCount && (
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{assessment.wordCount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.totalWords}</p>
                </div>
              )}
              {assessment.fillerWordCount !== undefined && (
                <div className="text-center">
                  <p className={`text-xl font-bold ${assessment.fillerWordCount > 20 ? "text-red-400" : assessment.fillerWordCount > 8 ? "text-amber-400" : "text-green-400"}`}>
                    {assessment.fillerWordCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.fillerWords}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
