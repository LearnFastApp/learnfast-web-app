"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { TrendingUp, Users, Mic, Loader2, Calendar, ChevronRight, CheckCircle2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection";

interface MySession {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  linkedConsumerSessionId: string | null;
  feedbackCode: string;
  responsesCount: number;
  avgScores: Record<Dimension, number> | null;
}

interface MySessionsResponse {
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
  promotedAssessmentId?: string | null;
}

const DIMENSION_LABEL: Record<Dimension, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
};

const DIMENSION_COLOR: Record<Dimension, string> = {
  clarity: "text-violet-400 bg-violet-400/10",
  energy: "text-amber-400 bg-amber-400/10",
  engagement: "text-cyan-400 bg-cyan-400/10",
  understanding: "text-emerald-400 bg-emerald-400/10",
  connection: "text-pink-400 bg-pink-400/10",
};

// Same hex palette as the personal /analytics trend chart, so the line
// colors read consistently for anyone who's seen both views.
const DIM_LINE_COLOR: Record<Dimension, string> = {
  clarity: "#8b5cf6",
  engagement: "#22d3ee",
  energy: "#f59e0b",
  understanding: "#34d399",
  connection: "#f472b6",
};

function TrendTooltip(props: Record<string, unknown>) {
  const { active, payload, label } = props as {
    active: boolean;
    payload: Array<{ dataKey: string; value: number; color: string }>;
    label: string;
  };
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {DIMENSION_LABEL[p.dataKey as Dimension]} · {p.value.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "text-slate-400 bg-slate-400/10",
  live: "text-green-400 bg-green-400/10",
  completed: "text-violet-400 bg-violet-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function calcOverallMean(overallAvg: Record<Dimension, number> | null): string {
  if (!overallAvg) return "—";
  const dims: Dimension[] = ["clarity", "energy", "engagement", "understanding", "connection"];
  const vals = dims.map((d) => overallAvg[d]).filter((v) => typeof v === "number");
  if (vals.length === 0) return "—";
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return mean.toFixed(1);
}

export default function MySessionsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<MySessionsResponse | null>(null);
  const [rehearsals, setRehearsals] = useState<RehearsalSession[]>([]);
  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDims, setActiveDims] = useState<Set<Dimension>>(
    new Set(["clarity", "energy", "engagement", "understanding", "connection"])
  );

  function toggleDim(dim: Dimension) {
    setActiveDims((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) { if (next.size > 1) next.delete(dim); }
      else next.add(dim);
      return next;
    });
  }

  async function deleteRehearsal(sessionId: string) {
    if (!user || deletingId) return;
    if (!confirm("Delete this rehearsal session? This cannot be undone.")) return;
    setDeletingId(sessionId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rehearsal/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setRehearsals((prev) => prev.filter((r) => r.id !== sessionId));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [myRes, orgRes, rehRes] = await Promise.all([
        fetch(`/api/org/${orgId}/my-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/org/${orgId}/info`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/rehearsal?orgId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (myRes.status === 401) {
        router.replace("/auth/login");
        return;
      }
      if (myRes.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (myRes.ok) {
        const d = await myRes.json();
        setData(d);
      }
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgName(d.name ?? "");
        setMyRole(d.myRole ?? null);
        setLogoUrl(d.logoUrl ?? null);
      }
      if (rehRes.ok) {
        const d = await rehRes.json();
        setRehearsals(d.sessions ?? []);
      }
    } catch {
      /* ignore */
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

  const isPrivileged =
    myRole === "owner" || myRole === "admin" || myRole === "coach";

  const dims: Dimension[] = [
    "clarity",
    "energy",
    "engagement",
    "understanding",
    "connection",
  ];

  const radarData =
    data?.overallAvg
      ? dims.map((d) => ({
          dimension: DIMENSION_LABEL[d],
          value: data.overallAvg![d] ?? 0,
        }))
      : [];

  // Sessions come back newest-first (scheduledStart desc) — reverse to
  // chronological order for a left-to-right trend line, keeping only
  // sessions that actually have scored feedback.
  const trendData = (data?.sessions ?? [])
    .filter((s) => s.avgScores !== null)
    .slice()
    .reverse()
    .map((s, i) => ({
      xKey: String(i),
      name: s.title.length > 18 ? s.title.slice(0, 18) + "…" : s.title,
      date: s.scheduledStart
        ? new Date(s.scheduledStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "—",
      ...s.avgScores,
    }));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={logoUrl} />

      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-7 h-7 text-violet-400" />
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        </div>

        {/* Stats row */}
        {data && data.totalSessions > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1">Sessions presented</p>
              <p className="text-3xl font-bold">{data.totalSessions}</p>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1">Feedback responses collected</p>
              <p className="text-3xl font-bold">{data.totalResponses}</p>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1">Overall avg score</p>
              <p className="text-3xl font-bold">{calcOverallMean(data.overallAvg)}</p>
            </div>
          </div>
        )}

        {/* Trend over time */}
        {trendData.length >= 2 && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 mb-8">
            <p className="text-sm font-medium text-slate-300 mb-4">
              Your dimensions over time
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {dims.map((dim) => {
                const active = activeDims.has(dim);
                return (
                  <button
                    key={dim}
                    onClick={() => toggleDim(dim)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition border"
                    style={{
                      borderColor: active ? DIM_LINE_COLOR[dim] : "#1e293b",
                      backgroundColor: active ? `${DIM_LINE_COLOR[dim]}22` : "transparent",
                      color: active ? DIM_LINE_COLOR[dim] : "#64748b",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: active ? DIM_LINE_COLOR[dim] : "#64748b" }}
                    />
                    {DIMENSION_LABEL[dim]}
                  </button>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#ffffff08" />
                <XAxis
                  dataKey="xKey"
                  ticks={trendData.map((d) => d.xKey)}
                  tickFormatter={(val: string) => trendData[Number(val)]?.date ?? val}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={TrendTooltip} />
                {dims.filter((d) => activeDims.has(d)).map((dim) => (
                  <Line
                    key={dim}
                    type="linear"
                    dataKey={dim}
                    stroke={DIM_LINE_COLOR[dim]}
                    strokeWidth={2}
                    dot={{ fill: DIM_LINE_COLOR[dim], r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: DIM_LINE_COLOR[dim], stroke: "#0f172a", strokeWidth: 2 }}
                    name={DIMENSION_LABEL[dim]}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Radar chart */}
        {data?.overallAvg && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 mb-8">
            <p className="text-sm font-medium text-slate-300 mb-4">
              Your dimension averages
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Radar
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session list */}
        {!data || data.sessions.length === 0 ? (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-10 flex flex-col items-center text-center gap-4">
            <Mic className="w-10 h-10 text-slate-600" />
            <p className="text-lg font-semibold text-slate-300">
              No presenting sessions yet
            </p>
            <p className="text-sm text-slate-500 max-w-sm">
              When you present a session in your organisation, your results will
              appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.sessions.map((session) => {
              const canViewAnalysis =
                session.linkedConsumerSessionId &&
                (session.status === "completed" || session.status === "live");

              return (
                <div
                  key={session.id}
                  className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5"
                >
                  {/* Row 1: title + badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-white">{session.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-400/10 text-slate-400 capitalize">
                      {session.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                        STATUS_COLORS[session.status] ?? "text-slate-400 bg-slate-400/10"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  {/* Row 2: date + response count */}
                  <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-slate-400">
                    {session.scheduledStart && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.scheduledStart)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {session.responsesCount}{" "}
                      {session.responsesCount === 1 ? "response" : "responses"}
                    </span>
                  </div>

                  {/* Row 3: dimension pills */}
                  {session.avgScores && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dims.map((dim) => {
                        const score = session.avgScores![dim];
                        if (typeof score !== "number") return null;
                        return (
                          <span
                            key={dim}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${DIMENSION_COLOR[dim]}`}
                          >
                            {DIMENSION_LABEL[dim]} · {score.toFixed(1)}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer: view full analysis */}
                  {canViewAnalysis && (
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

        {/* Rehearsal history */}
        {rehearsals.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Rehearsals</h2>
            <div className="space-y-2">
              {rehearsals.map((r) => (
                <div key={r.id} className="relative group">
                  <a
                    href={`/rehearse/${r.id}`}
                    className="flex items-center justify-between bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 hover:border-violet-500/30 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="min-w-0 pr-8">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{r.title}</span>
                        {r.promotedAssessmentId && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Promoted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.takeCount} {r.takeCount === 1 ? "take" : "takes"}
                        {r.createdAt ? ` · ${formatDate(r.createdAt)}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRehearsal(r.id); }}
                    disabled={deletingId === r.id}
                    className="absolute right-10 top-1/2 -translate-y-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                    aria-label="Delete rehearsal"
                  >
                    {deletingId === r.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
