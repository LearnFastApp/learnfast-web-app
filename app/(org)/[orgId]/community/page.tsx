"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import { DIM_COLOURS, DIMS, type Dim, type RankInfo } from "@/lib/rank";
import { Loader2, MessageSquare, Play, Users } from "lucide-react";

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
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: `${rank.colour}18`,
        color: rank.colour,
      }}
    >
      {rank.name}
    </span>
  );
}

function FeedCard({ item, onClick }: { item: FeedItem; onClick: () => void }) {
  const accentColour = item.rank.colour;
  const overallScore = item.featuredTake?.scores
    ? Math.round(
        Object.values(item.featuredTake.scores).reduce((a, b) => a + b, 0) / 5,
      )
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition hover:brightness-110"
      style={{
        backgroundColor: "#0d1117",
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
            <span key={t} className="text-[10px] text-slate-600 bg-white/5 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Dim bars */}
      {item.featuredTake?.scores && <DimBar scores={item.featuredTake.scores} />}

      {/* Footer */}
      <div
        className="flex items-center gap-3 mt-3 pt-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
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

export default function OrgCommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimFilter, setDimFilter] = useState<Dim | "">("");
  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [feedRes, infoRes] = await Promise.all([
        fetch(`/api/org/${orgId}/feed`, { headers }),
        fetch(`/api/org/${orgId}/info`, { headers }),
      ]);

      if (feedRes.status === 401) {
        router.replace("/auth/login");
        return;
      }
      if (feedRes.status === 403) {
        router.replace("/dashboard");
        return;
      }

      if (feedRes.ok) {
        const data = await feedRes.json();
        setItems(data.items ?? []);
      }

      if (infoRes.ok) {
        const data = await infoRes.json();
        setOrgName(data.name ?? "");
        setMyRole(data.myRole ?? null);
        setLogoUrl(data.logoUrl ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    fetchData();
  }, [user, authLoading, fetchData]);

  const filteredItems =
    dimFilter === ""
      ? items
      : items.filter((item) => item.featuredTake?.scores?.[dimFilter] !== undefined);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d]">
      <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={logoUrl} />
      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-400" />
            Team Coaching Feed
          </h1>
        </div>

        {/* About card */}
        <div className="mb-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            About this space
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Rehearsals shared by your colleagues. Each recording has been assessed by AI — your job
            is to add the human perspective. Leave{" "}
            <span className="text-white font-semibold">specific</span>,{" "}
            <span className="text-white font-semibold">honest</span>, and{" "}
            <span className="text-white font-semibold">kind</span> feedback. Share your own from
            the Rehearse page.
          </p>
        </div>

        {/* Dimension filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
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
                backgroundColor:
                  dimFilter === d ? `${DIM_COLOURS[d]}18` : "rgba(255,255,255,0.04)",
                color: dimFilter === d ? DIM_COLOURS[d] : "#64748b",
                border: `1px solid ${dimFilter === d ? `${DIM_COLOURS[d]}40` : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {DIM_FILTER_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Feed */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm">No shared rehearsals yet.</p>
            <p className="text-slate-700 text-xs mt-1">
              Share one from the{" "}
              <a href={`/${orgId}/rehearse`} className="text-violet-400 underline">
                Rehearse page
              </a>{" "}
              to appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
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
    </div>
  );
}
