"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRIES, industryLabel } from "@/lib/industries";
import { Trophy, Loader2, Lock, AlertCircle, Medal } from "lucide-react";
import MobileNav from "@/components/mobile-nav";

const DIMENSIONS = [
  { key: "overall",       en: "Overall",       fr: "Général" },
  { key: "clarity",       en: "Clarity",       fr: "Clarté" },
  { key: "energy",        en: "Energy",        fr: "Énergie" },
  { key: "engagement",    en: "Engagement",    fr: "Engagement" },
  { key: "understanding", en: "Understanding", fr: "Compréhension" },
  { key: "connection",    en: "Connection",    fr: "Connexion" },
] as const;

const DIM_COLORS: Record<string, string> = {
  clarity: "#8b5cf6", energy: "#f59e0b", engagement: "#22d3ee",
  understanding: "#34d399", connection: "#f472b6", overall: "#a78bfa",
};

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  scores: Record<string, number>;
  overall: number;
  isCurrentUser: boolean;
  percentile: number;
}

interface LeaderboardData {
  industry: string;
  industryLabel: string;
  dimension: string;
  totalEntries: number;
  totalWithNickname: number;
  belowThreshold: boolean;
  minEntries: number;
  hasNickname: boolean;
  entries: LeaderboardEntry[];
  currentUserOutside: LeaderboardEntry | null;
}

const S = {
  en: {
    title: "Industry Leaderboard",
    subtitle: "Ranked by most recent AI assessment score",
    yourIndustry: "Your industry",
    rank: "Rank",
    nickname: "Nickname",
    score: "Score",
    percentile: "Percentile",
    you: "You",
    yourRank: "Your rank",
    noNickname: "Set a nickname in Settings to appear on this leaderboard.",
    goSettings: "Go to Settings →",
    belowThreshold: (n: number, industry: string) =>
      `The ${industry} leaderboard unlocks once ${n} professionals have completed an AI assessment. Be one of the first.`,
    noEntries: "No ranked entries yet — be the first in your industry.",
    upgradeTitle: "Premium feature",
    upgradeDesc: "Upgrade to see how you rank against peers in your industry.",
    upgrade: "Upgrade to Pro →",
    dimLabel: (dim: string, locale: "en" | "fr") =>
      DIMENSIONS.find((d) => d.key === dim)?.[locale] ?? dim,
    topN: (n: number) => `Top ${n}`,
    outOf: (n: number) => `of ${n}`,
  },
  fr: {
    title: "Classement sectoriel",
    subtitle: "Classé par score IA le plus récent",
    yourIndustry: "Votre secteur",
    rank: "Rang",
    nickname: "Pseudo",
    score: "Score",
    percentile: "Percentile",
    you: "Vous",
    yourRank: "Votre rang",
    noNickname: "Définissez un pseudo dans les Paramètres pour apparaître sur ce classement.",
    goSettings: "Aller aux paramètres →",
    belowThreshold: (n: number, industry: string) =>
      `Le classement ${industry} se débloque dès que ${n} professionnels auront complété une évaluation IA.`,
    noEntries: "Aucune entrée classée pour l'instant — soyez le premier de votre secteur.",
    upgradeTitle: "Fonctionnalité Premium",
    upgradeDesc: "Passez à Pro pour voir comment vous vous positionnez face à vos pairs.",
    upgrade: "Passer à Pro →",
    dimLabel: (dim: string, locale: "en" | "fr") =>
      DIMENSIONS.find((d) => d.key === dim)?.[locale] ?? dim,
    topN: (n: number) => `Top ${n}`,
    outOf: (n: number) => `sur ${n}`,
  },
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [userIndustry, setUserIndustry] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedDim, setSelectedDim] = useState("overall");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // Fetch presenter profile
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.locale === "fr") setLocale("fr");
      const ind = d.industry as string | undefined;
      if (ind) { setUserIndustry(ind); setSelectedIndustry(ind); }
    });
  }, [user]);

  const fetchLeaderboard = useCallback(async (industry: string, dimension: string) => {
    if (!user || !industry) return;
    setLoading(true);
    setData(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/leaderboard?industry=${industry}&dimension=${dimension}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setUpgradeRequired(true); return; }
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedIndustry) fetchLeaderboard(selectedIndustry, selectedDim);
  }, [selectedIndustry, selectedDim, fetchLeaderboard]);

  const s = S[locale];

  if (authLoading) return null;

  if (upgradeRequired) {
    return (
      <main className="min-h-screen bg-[#05070d] text-white pb-20 lg:pb-0">
        <MobileNav locale={locale} />
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <div className="text-center max-w-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
              <Lock className="h-7 w-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">{s.upgradeTitle}</h2>
            <p className="text-slate-400 text-sm mb-6">{s.upgradeDesc}</p>
            <a href="/pricing" className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition">
              {s.upgrade}
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-20 lg:pb-0">
      <MobileNav locale={locale} />

      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold">{s.title}</h1>
        </div>
        <p className="text-sm text-slate-400 ml-8">{s.subtitle}</p>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

        {/* No nickname banner */}
        {data && !data.hasNickname && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200">{s.noNickname}</p>
              <a href="/settings" className="text-xs text-amber-400 hover:text-amber-300 mt-1 inline-block">{s.goSettings}</a>
            </div>
          </div>
        )}

        {/* Industry tabs */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{s.yourIndustry}</p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.value}
                onClick={() => setSelectedIndustry(ind.value)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  selectedIndustry === ind.value
                    ? "bg-violet-500 text-white"
                    : ind.value === userIndustry
                    ? "border border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                    : "border border-white/10 text-slate-400 hover:text-white hover:border-white/30"
                }`}
              >
                {locale === "fr" ? ind.fr : ind.en}
                {ind.value === userIndustry && selectedIndustry !== ind.value && (
                  <span className="ml-1.5 text-[10px] text-violet-400">★</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dimension tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.key}
              onClick={() => setSelectedDim(dim.key)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                selectedDim === dim.key
                  ? "text-white"
                  : "border border-white/10 text-slate-400 hover:text-white"
              }`}
              style={selectedDim === dim.key ? { background: DIM_COLORS[dim.key] + "33", borderWidth: 1, borderColor: DIM_COLORS[dim.key] + "66", color: DIM_COLORS[dim.key] } : {}}
            >
              {dim[locale]}
            </button>
          ))}
        </div>

        {/* Leaderboard body */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
          </div>
        )}

        {data && !loading && (
          <>
            {data.belowThreshold ? (
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
                <Trophy className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {s.belowThreshold(data.minEntries, industryLabel(data.industry, locale))}
                </p>
                <p className="text-xs text-slate-600 mt-2">{data.totalEntries} / {data.minEntries}</p>
              </div>
            ) : data.entries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
                <p className="text-sm text-slate-400">{s.noEntries}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[44px_1fr_80px_80px] gap-0 border-b border-white/10 px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">{s.rank}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">{s.nickname}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 text-right">{s.score}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 text-right">{s.percentile}</p>
                </div>

                {/* Entries */}
                {data.entries.map((entry) => (
                  <EntryRow
                    key={entry.rank}
                    entry={entry}
                    dimension={selectedDim}
                    youLabel={s.you}
                    locale={locale}
                  />
                ))}

                {/* Current user outside top 25 */}
                {data.currentUserOutside && (
                  <>
                    <div className="border-t border-white/10 px-5 py-2 text-center">
                      <span className="text-[11px] text-slate-600">· · ·</span>
                    </div>
                    <EntryRow
                      entry={data.currentUserOutside}
                      dimension={selectedDim}
                      youLabel={s.you}
                      locale={locale}
                      labelOverride={s.yourRank}
                    />
                  </>
                )}

                {/* Footer */}
                <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between">
                  <p className="text-[11px] text-slate-600">
                    {data.totalWithNickname > 0 && `${s.topN(Math.min(25, data.totalWithNickname))} ${s.outOf(data.totalWithNickname)}`}
                  </p>
                  <p className="text-[11px] text-slate-600">{s.subtitle}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EntryRow({ entry, dimension, youLabel, locale, labelOverride }: {
  entry: LeaderboardEntry;
  dimension: string;
  youLabel: string;
  locale: "en" | "fr";
  labelOverride?: string;
}) {
  const isTop3 = entry.rank <= 3;
  const medalColors = ["#f59e0b", "#94a3b8", "#cd7c2f"];

  return (
    <div className={`grid grid-cols-[44px_1fr_80px_80px] gap-0 px-5 py-3.5 border-b border-white/5 last:border-0 transition ${
      entry.isCurrentUser ? "bg-amber-500/[0.07]" : "hover:bg-white/[0.02]"
    }`}>
      {/* Rank */}
      <div className="flex items-center">
        {isTop3 ? (
          <Medal className="h-4 w-4" style={{ color: medalColors[entry.rank - 1] }} />
        ) : (
          <span className="text-sm font-bold text-slate-500">{entry.rank}</span>
        )}
      </div>

      {/* Nickname */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-semibold truncate ${entry.isCurrentUser ? "text-amber-300" : "text-white"}`}>
          {entry.nickname}
        </span>
        {entry.isCurrentUser && (
          <span className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
            {labelOverride ?? youLabel}
          </span>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center justify-end">
        <span
          className="text-base font-black"
          style={{ color: DIM_COLORS[dimension] ?? "#a78bfa" }}
        >
          {entry.score}
        </span>
      </div>

      {/* Percentile */}
      <div className="flex items-center justify-end">
        <span className="text-sm text-slate-400">{entry.percentile}th</span>
      </div>
    </div>
  );
}
