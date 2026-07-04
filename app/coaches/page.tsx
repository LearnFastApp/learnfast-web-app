"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { trackCoachRosterViewed } from "@/lib/coach-analytics";

interface CoachCard {
  id: string;
  slug: string;
  name: string;
  headshotUrl: string;
  quote: string;
  bioShort: string;
  specialties: string[];
  credentials: string;
  callDurationMins: number;
  learnfastScore: number | null;
  archetype: string | null;
  listingTier: string;
  featured: boolean;
}

const ALL_SPECIALTIES = [
  "Executive presence",
  "Storytelling",
  "Pitch coaching",
  "Leadership communication",
  "Confidence",
  "Public speaking",
  "Data storytelling",
  "Negotiation",
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score >= 65
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      LF {score}
    </span>
  );
}

function CoachCardUI({ coach }: { coach: CoachCard }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="group flex flex-col bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0a0f1a]">
        <Image
          src={coach.headshotUrl}
          alt={coach.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
        />
        {coach.listingTier === "founding" && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-violet-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3" /> Founding
          </span>
        )}
        {coach.featured && coach.listingTier !== "founding" && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-[#1e293b] text-violet-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-500/30">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-white font-semibold text-base">{coach.name}</h3>
          {coach.learnfastScore !== null && <ScoreBadge score={coach.learnfastScore} />}
        </div>

        {coach.archetype && (
          <p className="text-violet-400 text-xs font-medium mb-2">{coach.archetype}</p>
        )}

        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3">
          &ldquo;{coach.quote}&rdquo;
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {coach.specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-xs text-slate-400 bg-[#1e293b] border border-[#334155] rounded-full px-2.5 py-0.5">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {coach.callDurationMins} min call
          </span>
          <span className="inline-flex items-center gap-1 text-violet-400 text-sm font-semibold group-hover:gap-2 transition-all">
            Book a call <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CoachRosterPage() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<CoachCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [orgBlocked, setOrgBlocked] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Check if user is an org member with coach roster disabled
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then(async (snap) => {
      const oid = snap.data()?.orgId as string | undefined;
      if (!oid) return;
      setOrgId(oid);
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${oid}/info`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const org = await res.json() as { coachRoster?: { enabled: boolean } };
      if (org.coachRoster && org.coachRoster.enabled === false) {
        setOrgBlocked(true);
      }
    }).catch(() => {});
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSpecialty) params.set("specialty", selectedSpecialty);
      const res = await fetch(`/api/coaches?${params}`);
      const data = await res.json() as { coaches: CoachCard[] };
      setCoaches(data.coaches ?? []);
    } catch {
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { trackCoachRosterViewed(); }, []);

  const filtered = coaches.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.bioShort.toLowerCase().includes(q) ||
      c.specialties.some((s) => s.toLowerCase().includes(q))
    );
  });

  if (orgBlocked) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-slate-500 text-2xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-white mb-2">Not available for your organisation</h1>
          <p className="text-slate-400 text-sm mb-6">
            Your organisation hasn&apos;t enabled the coach roster. Contact your admin for details.
          </p>
          <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      {/* Header */}
      <div className="border-b border-[#1e293b]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-lg">LearnFast</Link>
          <div className="flex items-center gap-3">
            <Link href="/coaches/apply" className="text-slate-400 hover:text-white text-sm transition-colors">
              Apply as coach
            </Link>
            <Link href="/dashboard" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Work 1:1 with an{" "}
            <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              executive coach
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Every coach on our roster is vetted for communication expertise. Book a free discovery call to find your fit.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search coaches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 min-w-[200px]"
          >
            <option value="">All specialties</option>
            {ALL_SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[#1e293b]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-[#1e293b] rounded w-2/3" />
                  <div className="h-4 bg-[#1e293b] rounded w-full" />
                  <div className="h-4 bg-[#1e293b] rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-slate-500 text-lg">No coaches match your search.</p>
            <button onClick={() => { setSearch(""); setSelectedSpecialty(""); }} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((coach) => (
              <CoachCardUI key={coach.id} coach={coach} />
            ))}
          </div>
        )}

        {/* Apply CTA */}
        <div className="mt-20 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Are you a coach?</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            We&apos;re selectively adding coaches who specialise in communication and executive presence.
          </p>
          <Link
            href="/coaches/apply"
            className="inline-flex items-center gap-2 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Apply to join <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
