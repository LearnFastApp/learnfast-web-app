"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { TrendingUp, Users, Mic, Loader2, Calendar, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
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
  const [loading, setLoading] = useState(true);

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
        fetch("/api/rehearsal", { headers: { Authorization: `Bearer ${token}` } }),
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <MobileNav />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          {orgName && (
            <p className="text-sm text-slate-400 mb-1">{orgName}</p>
          )}
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-7 h-7 text-violet-400" />
            <h1 className="text-2xl font-bold">My performance</h1>
          </div>

          {/* Nav row */}
          <nav className="flex flex-wrap gap-1">
            <a
              href={`/${orgId}/members`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Members
            </a>
            <a
              href={`/${orgId}/billing`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Billing
            </a>
            <a
              href={`/${orgId}/content`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Content
            </a>
            <a
              href={`/${orgId}/sessions`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sessions
            </a>
            <a
              href={`/${orgId}/rehearse`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Rehearse
            </a>
            {isPrivileged && (
              <a
                href={`/${orgId}/analytics`}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Analytics
              </a>
            )}
            <span className="px-3 py-1.5 rounded-lg text-sm text-violet-400 bg-violet-400/10 font-medium">
              My sessions
            </span>
            <a
              href={`/${orgId}/community`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Community
            </a>
          </nav>
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
                <a
                  key={r.id}
                  href={`/rehearse/${r.id}`}
                  className="flex items-center justify-between bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 hover:border-violet-500/30 hover:bg-white/[0.02] transition-all group"
                >
                  <div className="min-w-0">
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
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0 ml-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
