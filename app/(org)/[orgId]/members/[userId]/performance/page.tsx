"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Users, Mic, Loader2,
  Calendar, AlertCircle, Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection";
const DIMS: Dimension[] = ["clarity", "energy", "engagement", "understanding", "connection"];
const DIM_LABEL: Record<Dimension, string> = {
  clarity: "Clarity", energy: "Energy", engagement: "Engagement",
  understanding: "Understanding", connection: "Connection",
};
const DIM_COLOR: Record<Dimension, string> = {
  clarity: "#8b5cf6", energy: "#f59e0b", engagement: "#22d3ee",
  understanding: "#34d399", connection: "#f472b6",
};
const DIM_PILL: Record<Dimension, string> = {
  clarity: "text-violet-400 bg-violet-400/10", energy: "text-amber-400 bg-amber-400/10",
  engagement: "text-cyan-400 bg-cyan-400/10", understanding: "text-emerald-400 bg-emerald-400/10",
  connection: "text-pink-400 bg-pink-400/10",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "text-slate-400 bg-slate-400/10", live: "text-green-400 bg-green-400/10",
  completed: "text-violet-400 bg-violet-400/10", cancelled: "text-red-400 bg-red-400/10",
};

interface Session {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: string | null;
  linkedConsumerSessionId: string | null;
  responsesCount: number;
  avgScores: Record<Dimension, number> | null;
}

interface MemberPerformance {
  member: { displayName: string; email: string; role: string };
  sessions: Session[];
  overallAvg: Record<Dimension, number> | null;
  totalSessions: number;
  totalResponses: number;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function shortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return iso; }
}

function overallMean(avg: Record<Dimension, number> | null): string {
  if (!avg) return "—";
  const vals = DIMS.map((d) => avg[d]);
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function trendDelta(sessions: Session[], dim: Dimension): number {
  const withScores = sessions.filter((s) => s.avgScores !== null);
  if (withScores.length < 2) return 0;
  return Math.round(
    (withScores[withScores.length - 1].avgScores![dim] - withScores[0].avgScores![dim]) * 10
  ) / 10;
}

function ChartTooltip(props: Record<string, unknown>) {
  const { active, payload } = props as {
    active: boolean;
    payload: { name: string; value: number; color: string; payload: { label: string; date: string } }[];
  };
  if (!active || !payload?.length) return null;
  const { label, date } = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/15 bg-[#1a2135] px-4 py-3 shadow-xl min-w-[180px]">
      {label && <p className="text-xs font-semibold text-white mb-0.5 truncate max-w-[200px]">{label}</p>}
      <p className="text-[11px] text-slate-500 mb-2">{date}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-300 capitalize">{entry.name}:</span>
          <span className="text-white font-bold ml-auto pl-3">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MemberPerformancePage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const userId = params?.userId as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<MemberPerformance | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "disabled" | "unknown" | null>(null);
  const [activeDims, setActiveDims] = useState<Set<Dimension>>(new Set(DIMS));

  function toggleDim(dim: Dimension) {
    setActiveDims((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) { if (next.size > 1) next.delete(dim); }
      else next.add(dim);
      return next;
    });
  }

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const h = { Authorization: `Bearer ${token}` };
      const [perfRes, orgRes] = await Promise.all([
        fetch(`/api/org/${orgId}/members/${userId}/sessions`, { headers: h }),
        fetch(`/api/org/${orgId}/info`, { headers: h }),
      ]);
      if (perfRes.status === 401) { router.replace("/auth/login"); return; }
      if (perfRes.status === 403) {
        const d = await perfRes.json().catch(() => ({}));
        setError(d.error === "individual_sessions_disabled" ? "disabled" : "forbidden");
        return;
      }
      if (perfRes.status === 404) { router.replace(`/${orgId}/analytics`); return; }
      if (perfRes.ok) setData(await perfRes.json());
      else setError("unknown");
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgName(d.name ?? "");
        setMyRole(d.myRole ?? null);
        setOrgLogoUrl(d.logoUrl ?? null);
      }
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }, [user, orgId, userId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  // Sessions newest-first from API; reverse for chronological chart
  const chronologicalSessions = data ? [...data.sessions].reverse() : [];
  const sessionsWithScores = chronologicalSessions.filter((s) => s.avgScores !== null);

  const chartData = sessionsWithScores.map((s, i) => ({
    idx: String(i),
    label: s.title,
    date: s.scheduledStart ? shortDate(s.scheduledStart) : `#${i + 1}`,
    ...s.avgScores,
  }));

  const radarData = data?.overallAvg
    ? DIMS.map((d) => ({ dimension: DIM_LABEL[d], value: data.overallAvg![d] ?? 0 }))
    : [];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#05070d] text-white">
        <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={orgLogoUrl} />
        <main className="md:ml-60 pt-16 md:pt-0 flex items-center justify-center p-6 min-h-screen">
          <div className="max-w-sm w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
            {error === "disabled" ? (
              <>
                <Lock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Individual sessions hidden</p>
                <p className="text-slate-400 text-sm mb-4">
                  An admin can enable member performance visibility in Organisation Settings.
                </p>
                <a href={`/${orgId}/settings`} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Go to Settings →
                </a>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Unable to load</p>
                <p className="text-slate-400 text-sm">You don&apos;t have permission to view this page.</p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={orgLogoUrl} />
      <main className="md:ml-60 pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto px-4 py-10">

          {/* Back */}
          <a
            href={`/${orgId}/analytics`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Team Analytics
          </a>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-violet-300">
                {data?.member.displayName?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data?.member.displayName}</h1>
              <p className="text-sm text-slate-400">{data?.member.email}</p>
            </div>
          </div>

          {/* Stats */}
          {data && data.totalSessions > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                <p className="text-xs text-slate-400 mb-1">Sessions presented</p>
                <p className="text-3xl font-bold">{data.totalSessions}</p>
              </div>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                <p className="text-xs text-slate-400 mb-1">Feedback responses</p>
                <p className="text-3xl font-bold">{data.totalResponses}</p>
              </div>
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                <p className="text-xs text-slate-400 mb-1">Overall avg score</p>
                <p className="text-3xl font-bold">{overallMean(data.overallAvg)}</p>
              </div>
            </div>
          )}

          {/* No data empty state */}
          {(!data || data.sessions.length === 0) && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-10 flex flex-col items-center text-center gap-4 mb-8">
              <Mic className="w-10 h-10 text-slate-600" />
              <p className="text-lg font-semibold text-slate-300">No presenting sessions yet</p>
              <p className="text-sm text-slate-500 max-w-sm">Sessions will appear here once this member presents.</p>
            </div>
          )}

          {data && sessionsWithScores.length >= 2 && (
            <>
              {/* Performance over time */}
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1">Performance over time</h2>
                    <p className="text-xs text-slate-500">Toggle dimensions to focus your view</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DIMS.map((dim) => {
                      const active = activeDims.has(dim);
                      return (
                        <button
                          key={dim}
                          onClick={() => toggleDim(dim)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition border"
                          style={{
                            borderColor: active ? DIM_COLOR[dim] : "rgba(255,255,255,0.1)",
                            backgroundColor: active ? `${DIM_COLOR[dim]}22` : "transparent",
                            color: active ? DIM_COLOR[dim] : "#64748b",
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: active ? DIM_COLOR[dim] : "#64748b" }}
                          />
                          {DIM_LABEL[dim]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="#ffffff08" />
                    <XAxis
                      dataKey="idx"
                      ticks={chartData.map((d) => d.idx)}
                      tickFormatter={(val: string) => chartData[Number(val)]?.date ?? val}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip content={ChartTooltip} />
                    {DIMS.filter((dim) => activeDims.has(dim)).map((dim) => (
                      <Line
                        key={dim}
                        type="linear"
                        dataKey={dim}
                        stroke={DIM_COLOR[dim]}
                        strokeWidth={2}
                        dot={{ fill: DIM_COLOR[dim], r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 7, fill: DIM_COLOR[dim], stroke: "#0f172a", strokeWidth: 2 }}
                        name={DIM_LABEL[dim]}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Profile + Dimension trends */}
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                {/* Radar */}
                <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                  <h2 className="text-base font-semibold text-white mb-1">Overall profile</h2>
                  <p className="text-xs text-slate-500 mb-4">Average across all sessions</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Dimension trends */}
                <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                  <h2 className="text-base font-semibold text-white mb-4">Dimension trends</h2>
                  <div className="space-y-4">
                    {DIMS.map((dim) => {
                      const score = data.overallAvg ? Math.round(data.overallAvg[dim]) : 0;
                      const delta = trendDelta(chronologicalSessions, dim);
                      return (
                        <div key={dim} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-slate-300 shrink-0">{DIM_LABEL[dim]}</div>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${score}%`, backgroundColor: DIM_COLOR[dim] }}
                            />
                          </div>
                          <div className="w-8 text-right text-sm font-bold text-white shrink-0">{score}</div>
                          <div className={`flex items-center gap-0.5 text-xs w-14 shrink-0 ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-slate-500"}`}>
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}` : "flat"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Radar only (not enough sessions for trend chart) */}
          {data && data.overallAvg && sessionsWithScores.length === 1 && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Overall profile</h2>
              <p className="text-xs text-slate-500 mb-4">Average across all sessions</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Session list */}
          {data && data.sessions.length > 0 && (
            <div className="flex flex-col gap-4">
              {data.sessions.map((session) => {
                const canView = session.linkedConsumerSessionId &&
                  (session.status === "completed" || session.status === "live");
                return (
                  <div key={session.id} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-white">{session.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-400/10 text-slate-400 capitalize">{session.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_COLORS[session.status] ?? "text-slate-400 bg-slate-400/10"}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-slate-400">
                      {session.scheduledStart && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(session.scheduledStart)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{session.responsesCount} {session.responsesCount === 1 ? "response" : "responses"}
                      </span>
                    </div>
                    {session.avgScores && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {DIMS.map((dim) => {
                          const score = session.avgScores![dim];
                          if (typeof score !== "number") return null;
                          return (
                            <span key={dim} className={`px-2.5 py-1 rounded-full text-xs font-medium ${DIM_PILL[dim]}`}>
                              {DIM_LABEL[dim]} · {score.toFixed(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {canView && (
                      <a
                        href={`/sessions/${session.linkedConsumerSessionId}`}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        View full analysis →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data && data.sessions.length > 0 && (
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-600">
              <TrendingUp className="w-3.5 h-3.5" />
              Showing {data.sessions.length} session{data.sessions.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
