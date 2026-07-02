"use client";

import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { Brain, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, AlertTriangle, TrendingUp, Users, Sparkles } from "lucide-react";
import { analyseAiVsAudience, analyseAiVsSelf, analyseAudienceVsSelf } from "@/lib/gap-analysis";
import type { DimensionScores, SignalGapAnalysis, GapInsight } from "@/lib/gap-analysis";
import { detectArchetype } from "@/lib/presenter-archetypes";
import type { PresenterArchetype } from "@/lib/presenter-archetypes";

// ─── Sample data sets ─────────────────────────────────────────────────────────

const SCENARIOS: Record<string, {
  label: string;
  description: string;
  ai: DimensionScores;
  audience: DimensionScores;
  reflection: DimensionScores;
}> = {
  imposter: {
    label: "The Imposter",
    description: "High AI + High Audience, but presenter rates themselves low",
    ai:         { clarity: 82, energy: 78, engagement: 80, understanding: 75, connection: 77 },
    audience:   { clarity: 79, energy: 81, engagement: 83, understanding: 77, connection: 80 },
    reflection: { clarity: 52, energy: 48, engagement: 55, understanding: 50, connection: 45 },
  },
  natural: {
    label: "The Natural",
    description: "Audience rates much higher than AI — charisma over technique",
    ai:         { clarity: 55, energy: 60, engagement: 52, understanding: 58, connection: 54 },
    audience:   { clarity: 74, energy: 80, engagement: 82, understanding: 72, connection: 85 },
    reflection: { clarity: 62, energy: 70, engagement: 68, understanding: 65, connection: 72 },
  },
  technician: {
    label: "The Technician",
    description: "AI scores high but audience doesn't feel it as strongly",
    ai:         { clarity: 85, energy: 80, engagement: 75, understanding: 82, connection: 70 },
    audience:   { clarity: 65, energy: 58, engagement: 55, understanding: 63, connection: 50 },
    reflection: { clarity: 80, energy: 75, engagement: 70, understanding: 78, connection: 65 },
  },
  expert: {
    label: "The Expert",
    description: "All three signals aligned at a high level",
    ai:         { clarity: 88, energy: 84, engagement: 86, understanding: 82, connection: 85 },
    audience:   { clarity: 85, energy: 87, engagement: 89, understanding: 83, connection: 88 },
    reflection: { clarity: 84, energy: 82, engagement: 85, understanding: 80, connection: 83 },
  },
  blind_spot: {
    label: "The Blind Spot",
    description: "Presenter rates themselves much higher than AI or audience",
    ai:         { clarity: 52, energy: 48, engagement: 45, understanding: 55, connection: 50 },
    audience:   { clarity: 50, energy: 45, engagement: 42, understanding: 52, connection: 48 },
    reflection: { clarity: 82, energy: 78, engagement: 80, understanding: 77, connection: 75 },
  },
  developer: {
    label: "The Developer",
    description: "Mixed/moderate signals — early stage with honest self-awareness",
    ai:         { clarity: 58, energy: 62, engagement: 55, understanding: 60, connection: 57 },
    audience:   { clarity: 60, energy: 65, engagement: 58, understanding: 62, connection: 60 },
    reflection: { clarity: 55, energy: 58, engagement: 52, understanding: 57, connection: 54 },
  },
};

const DIM_LABELS = { clarity: "Clarity", energy: "Energy", engagement: "Engagement", understanding: "Understanding", connection: "Connection" };
const DIM_COLORS = { clarity: "#8b5cf6", energy: "#f59e0b", engagement: "#22d3ee", understanding: "#34d399", connection: "#f472b6" };

const ARCHETYPE_COLORS: Record<string, string> = {
  expert: "amber", natural: "emerald", technician: "blue",
  imposter: "violet", overconfident: "rose", developer: "cyan",
};

const SEVERITY_STYLES: Record<string, string> = {
  significant: "border-rose-500/30 bg-rose-500/5",
  notable: "border-amber-500/20 bg-amber-500/5",
  aligned: "border-white/10 bg-white/[0.02]",
};

const SEVERITY_BADGE: Record<string, string> = {
  significant: "bg-rose-500/20 text-rose-400",
  notable: "bg-amber-500/20 text-amber-400",
  aligned: "bg-white/10 text-slate-400",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ArchetypeCard({ archetype }: { archetype: PresenterArchetype }) {
  const color = ARCHETYPE_COLORS[archetype.id] ?? "slate";
  const colorMap: Record<string, string> = {
    amber: "border-amber-500/30 bg-amber-500/[0.06] text-amber-400",
    emerald: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400",
    blue: "border-blue-500/30 bg-blue-500/[0.06] text-blue-400",
    violet: "border-violet-500/30 bg-violet-500/[0.06] text-violet-400",
    rose: "border-rose-500/30 bg-rose-500/[0.06] text-rose-400",
    cyan: "border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-400",
    slate: "border-slate-500/30 bg-slate-500/[0.06] text-slate-400",
  };
  const cls = colorMap[color];
  const textCls = cls.split(" ").find(c => c.startsWith("text-")) ?? "text-white";

  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${textCls}`}>Presenter Archetype</p>
          <h3 className="text-xl font-bold text-white">{archetype.name}</h3>
          <p className={`text-sm mt-0.5 ${textCls}`}>{archetype.tagline}</p>
        </div>
        <Sparkles className={`h-5 w-5 shrink-0 mt-1 ${textCls}`} />
      </div>
      <p className="text-sm text-slate-300 leading-relaxed mb-4">{archetype.description}</p>
      <div className="space-y-2">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Primary Strength</p>
          <p className="text-sm text-white">{archetype.primaryStrength}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Development Focus</p>
          <p className="text-sm text-white">{archetype.primaryDevelopment}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Coaching Focus</p>
          <p className="text-sm text-slate-300 leading-relaxed">{archetype.coachingFocus}</p>
        </div>
      </div>
    </div>
  );
}

function GapCard({ analysis }: { analysis: SignalGapAnalysis }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const significant = analysis.gaps.filter(g => g.severity !== "aligned");

  const signalIcon = (name: string) => {
    if (name.includes("AI")) return <Brain className="h-3.5 w-3.5" />;
    if (name.includes("Audience")) return <Users className="h-3.5 w-3.5" />;
    return <TrendingUp className="h-3.5 w-3.5" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            {signalIcon(analysis.signalA)} {analysis.signalA}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-600" />
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            {signalIcon(analysis.signalB)} {analysis.signalB}
          </span>
          <span className="ml-auto text-xs font-semibold text-slate-400">
            Divergence: <span className={analysis.overallDivergence >= 20 ? "text-rose-400" : analysis.overallDivergence >= 10 ? "text-amber-400" : "text-green-400"}>{analysis.overallDivergence}</span>
          </span>
        </div>
        <p className="text-sm font-semibold text-white">{analysis.headline}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Gap rows */}
      <div className="divide-y divide-white/5">
        {analysis.gaps.map((gap) => {
          const isOpen = expanded === gap.dimension;
          const hasInsight = gap.severity !== "aligned";
          return (
            <div key={gap.dimension} className={`px-5 py-3 ${hasInsight ? "cursor-pointer hover:bg-white/[0.03]" : ""}`} onClick={() => hasInsight && setExpanded(isOpen ? null : gap.dimension)}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DIM_COLORS[gap.dimension as keyof typeof DIM_COLORS] }} />
                <span className="text-sm text-white flex-1">{DIM_LABELS[gap.dimension as keyof typeof DIM_LABELS]}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[gap.severity]}`}>
                  {gap.severity === "aligned" ? "Aligned" : `${gap.gap > 0 ? "+" : ""}${gap.gap}`}
                </span>
                {hasInsight && (isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />)}
              </div>
              {isOpen && (
                <div className="mt-3 pl-5 space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">{gap.interpretation}</p>
                  {gap.coaching && (
                    <div className="rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Coaching</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{gap.coaching}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GapAnalysisPreviewPage() {
  const [scenarioKey, setScenarioKey] = useState<string>("imposter");
  const scenario = SCENARIOS[scenarioKey];

  const { ai, audience, reflection } = scenario;

  const radarData = (Object.keys(DIM_LABELS) as Array<keyof typeof DIM_LABELS>).map((dim) => ({
    dimension: DIM_LABELS[dim],
    ai: ai[dim],
    audience: audience[dim],
    reflection: reflection[dim],
    fullMark: 100,
  }));

  const aiVsAudience = analyseAiVsAudience(ai, audience);
  const aiVsSelf = analyseAiVsSelf(ai, reflection);
  const audienceVsSelf = analyseAudienceVsSelf(audience, reflection);
  const archetype = detectArchetype(ai, audience, reflection);

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <a href="/ai-assessment" className="text-sm text-slate-400 hover:text-white transition">← Back</a>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Gap Analysis Preview</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Phase 2</span>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">

        {/* Scenario picker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Select a presenter scenario</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(SCENARIOS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setScenarioKey(key)}
                className={`text-left rounded-xl border px-4 py-3 text-sm transition ${scenarioKey === key ? "border-amber-500/50 bg-amber-500/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"}`}
              >
                <p className="font-semibold">{s.label}</p>
                <p className="text-[11px] mt-0.5 opacity-70">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Archetype */}
        <ArchetypeCard archetype={archetype} />

        {/* Three-signal radar */}
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Three-Signal Overview</h2>
          <p className="text-xs text-slate-500 mb-5">AI assessment · audience feedback · self-reflection</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#ffffff15" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Radar name="AI Assessment" dataKey="ai" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Audience Feedback" dataKey="audience" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Self-Reflection" dataKey="reflection" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 3" />
              <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} wrapperStyle={{ paddingTop: 16 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-5 gap-1">
            {(Object.keys(DIM_LABELS) as Array<keyof typeof DIM_LABELS>).map((dim) => (
              <div key={dim} className="text-center">
                <p className="text-[9px] sm:text-xs text-slate-500 mb-1 leading-tight">{DIM_LABELS[dim]}</p>
                <p className="text-lg font-bold" style={{ color: DIM_COLORS[dim] }}>{ai[dim]}</p>
                <p className="text-[10px] text-violet-400">{audience[dim]}</p>
                <p className="text-[10px] text-cyan-400">{reflection[dim]}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 justify-center">
            <span className="text-[11px] text-amber-400">● AI</span>
            <span className="text-[11px] text-violet-400">● Audience</span>
            <span className="text-[11px] text-cyan-400">● Self</span>
          </div>
        </div>

        {/* Gap analyses */}
        <div>
          <h2 className="text-lg font-bold mb-4">Signal Gap Analysis</h2>
          <div className="space-y-4">
            <GapCard analysis={aiVsAudience} />
            <GapCard analysis={aiVsSelf} />
            <GapCard analysis={audienceVsSelf} />
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            This is a preview page with sample data — not visible to users. Once the upload flow is working end-to-end, the gap analysis and archetype sections will be added to the live results page.
          </p>
        </div>
      </div>
    </main>
  );
}
