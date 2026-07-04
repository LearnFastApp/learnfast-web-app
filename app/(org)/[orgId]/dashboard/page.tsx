"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  BarChart2,
  Brain,
  BookOpen,
  Loader2,
  Mic,
  ArrowRight,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection";

const DIMENSION_COLOR: Record<Dimension, string> = {
  clarity:      "bg-violet-500",
  energy:       "bg-amber-500",
  engagement:   "bg-cyan-500",
  understanding:"bg-emerald-500",
  connection:   "bg-pink-500",
};

interface MySession {
  id: string;
  title: string;
  status: string;
  scheduledStart: string | null;
  responsesCount: number;
  avgScores: Record<Dimension, number> | null;
}

interface DashData {
  sessions: MySession[];
  overallAvg: Record<Dimension, number> | null;
  totalSessions: number;
  totalResponses: number;
}

interface RehearsalSession {
  id: string;
  title: string;
  takeCount: number;
  createdAt: string | null;
}

const DIMS: Dimension[] = ["clarity", "energy", "engagement", "understanding", "connection"];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400 capitalize">{label}</span>
        <span className="text-white font-medium">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function OrgDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [dash, setDash] = useState<DashData | null>(null);
  const [rehearsals, setRehearsals] = useState<RehearsalSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const h = { Authorization: `Bearer ${token}` };
      const [orgRes, myRes, rehRes] = await Promise.all([
        fetch(`/api/org/${orgId}/info`, { headers: h }),
        fetch(`/api/org/${orgId}/my-sessions`, { headers: h }),
        fetch("/api/rehearsal", { headers: h }),
      ]);
      if (orgRes.status === 401 || myRes.status === 401) { router.replace("/auth/login"); return; }
      if (orgRes.ok) { const d = await orgRes.json(); setOrgName(d.name ?? ""); setMyRole(d.myRole ?? null); }
      if (myRes.ok) { setDash(await myRes.json()); }
      if (rehRes.ok) { const d = await rehRes.json(); setRehearsals((d.sessions ?? []).slice(0, 3)); }
      setDisplayName(user.displayName ?? user.email?.split("@")[0] ?? "");
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  const recentSessions = dash?.sessions.slice(0, 3) ?? [];
  const avg = dash?.overallAvg ?? null;
  const overallMean = avg
    ? (DIMS.reduce((s, d) => s + (avg[d] ?? 0), 0) / DIMS.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} />

      <main className="md:ml-60 pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto px-5 py-10">

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold">{displayName || "Your dashboard"}</h1>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Sessions presented", value: dash?.totalSessions ?? 0 },
              { label: "Responses received", value: dash?.totalResponses ?? 0 },
              { label: "Overall avg score", value: overallMean ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          {avg && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <p className="text-sm font-semibold">Your dimension averages</p>
              </div>
              <div className="space-y-3">
                {DIMS.map((d) => (
                  <ScoreBar key={d} label={d} value={avg[d] ?? 0} color={DIMENSION_COLOR[d]} />
                ))}
              </div>
              <a
                href={`/${orgId}/my-sessions`}
                className="mt-5 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Full analytics <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Recent sessions + rehearsals side by side */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">

            {/* Recent sessions */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold">Recent sessions</p>
                </div>
                <a href={`/${orgId}/my-sessions`} className="text-xs text-slate-500 hover:text-slate-300">
                  View all →
                </a>
              </div>
              {recentSessions.length === 0 ? (
                <div className="text-center py-6">
                  <Mic className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.title}</p>
                        {s.scheduledStart && (
                          <p className="text-xs text-slate-500 mt-0.5">{formatDate(s.scheduledStart)}</p>
                        )}
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-xs text-slate-400">{s.responsesCount} responses</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent rehearsals */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold">AI rehearsals</p>
                </div>
                <a href={`/${orgId}/rehearse`} className="text-xs text-slate-500 hover:text-slate-300">
                  View all →
                </a>
              </div>
              {rehearsals.length === 0 ? (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No rehearsals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rehearsals.map((r) => (
                    <a
                      key={r.id}
                      href={`/rehearse/${r.id}`}
                      className="flex items-center justify-between hover:bg-white/[0.02] rounded-lg -mx-2 px-2 py-1 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.title}</p>
                        {r.createdAt && (
                          <p className="text-xs text-slate-500 mt-0.5">{formatDate(r.createdAt)}</p>
                        )}
                      </div>
                      <p className="ml-3 text-xs text-slate-400 shrink-0">
                        {r.takeCount} {r.takeCount === 1 ? "take" : "takes"}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: `/${orgId}/rehearse`,   icon: Brain,        label: "Start a rehearsal",    sub: "Practice with AI feedback" },
              { href: `/${orgId}/community`,  icon: MessageSquare, label: "Team coaching feed",  sub: "See what your team is sharing" },
              { href: `/${orgId}/resources`,  icon: BookOpen,      label: "Resource hub",        sub: "Browse learning resources" },
            ].map(({ href, icon: Icon, label, sub }) => (
              <a
                key={href}
                href={href}
                className="flex items-start gap-3 bg-[#0f172a] border border-[#1e293b] hover:border-violet-500/30 rounded-2xl p-5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
