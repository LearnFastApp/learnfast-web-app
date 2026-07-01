"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DIM_COLOURS, DIM_LABELS, type Dim, DIMS } from "@/lib/rank";
import type { RankInfo } from "@/lib/rank";
import { Loader2, MessageSquare, Play, ArrowLeft } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  tags: string[];
  sharedAt: string;
  presenterId: string;
  presenterName: string | null;
  presenterJobTitle: string | null;
  presenterIndustry: string | null;
  rank: RankInfo;
  featuredTake: {
    id: string;
    audioUrl: string | null;
    scores: Record<string, number> | null;
    audioDurationSeconds: number | null;
    wordsPerMinute: number | null;
    strength: string | null;
    coaching: string | null;
  } | null;
  commentCount: number;
}

function DimBar({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="flex gap-1 mt-2">
      {DIMS.map((d) => (
        <div key={d} className="flex-1 flex flex-col gap-0.5 items-center">
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${scores[d] ?? 0}%`, backgroundColor: DIM_COLOURS[d] }}
            />
          </div>
          <span className="text-[8px] font-mono" style={{ color: DIM_COLOURS[d] }}>
            {scores[d] ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function InitialsAvatar({ name, colour }: { name: string; colour: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ backgroundColor: `${colour}22`, border: `1.5px solid ${colour}` }}
    >
      {initials}
    </div>
  );
}

function RankChip({ rank }: { rank: RankInfo }) {
  return (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{
      backgroundColor: `${rank.colour}18`,
      color: rank.colour,
    }}>
      {rank.name}
    </span>
  );
}

function FeedCard({ item, onClick }: { item: FeedItem; onClick: () => void }) {
  const accentColour = item.rank.colour;
  const overallScore = item.featuredTake?.scores
    ? Math.round(Object.values(item.featuredTake.scores).reduce((a, b) => a + b, 0) / 5)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition hover:brightness-110"
      style={{
        backgroundColor: "#0d1117",
        borderLeft: `3px solid ${accentColour}`,
        border: `1px solid rgba(255,255,255,0.07)`,
        borderLeftWidth: "3px",
        borderLeftColor: accentColour,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <InitialsAvatar name={item.presenterName ?? "?"} colour={accentColour} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">
                {item.presenterName ?? "Anonymous"}
              </span>
              <RankChip rank={item.rank} />
            </div>
            {item.presenterJobTitle && (
              <p className="text-[10px] text-slate-600 truncate">{item.presenterJobTitle}</p>
            )}
          </div>
        </div>
        {overallScore !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-black font-mono text-white">{overallScore}</p>
            <p className="text-[9px] text-slate-600">/100</p>
          </div>
        )}
      </div>

      {/* Title + tags */}
      <p className="text-sm font-semibold text-slate-200 mb-1 line-clamp-1">{item.title}</p>
      {item.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {item.tags.map((t) => (
            <span key={t} className="text-[10px] text-slate-600 bg-white/5 rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
      )}

      {/* Dim bars */}
      {item.featuredTake?.scores && <DimBar scores={item.featuredTake.scores} />}

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {item.featuredTake?.audioUrl && (
          <span className="flex items-center gap-1 text-[10px] text-violet-400">
            <Play className="h-3 w-3" /> Listen
          </span>
        )}
        {item.featuredTake?.audioDurationSeconds && (
          <span className="text-[10px] text-slate-600">
            {Math.round(item.featuredTake.audioDurationSeconds)}s
          </span>
        )}
        {item.featuredTake?.wordsPerMinute && (
          <span className="text-[10px] text-slate-600">
            {item.featuredTake.wordsPerMinute} WPM
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-600">
          <MessageSquare className="h-3 w-3" />
          {item.commentCount}
        </span>
      </div>
    </button>
  );
}

const DIM_FILTER_LABELS: Record<string, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
};

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimFilter, setDimFilter] = useState<Dim | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const url = dimFilter ? `/api/feed?dim=${dimFilter}` : "/api/feed";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [dimFilter]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#05070d" }}>
      <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#05070d" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4" style={{
        backgroundColor: "rgba(5,7,13,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-white">Coaching Feed</h1>
          <p className="text-xs text-slate-500">Real rehearsals · peer feedback</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Dimension filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setDimFilter("")}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            style={{
              backgroundColor: dimFilter === "" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              color: dimFilter === "" ? "white" : "#64748b",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            All
          </button>
          {DIMS.map((d) => (
            <button
              key={d}
              onClick={() => setDimFilter(d === dimFilter ? "" : d)}
              className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              style={{
                backgroundColor: dimFilter === d ? `${DIM_COLOURS[d]}18` : "rgba(255,255,255,0.04)",
                color: dimFilter === d ? DIM_COLOURS[d] : "#64748b",
                border: `1px solid ${dimFilter === d ? `${DIM_COLOURS[d]}40` : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {DIM_FILTER_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm">No shared rehearsals yet.</p>
            <p className="text-slate-700 text-xs mt-1">Share one from your dashboard to appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onClick={() => router.push(`/feed/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
