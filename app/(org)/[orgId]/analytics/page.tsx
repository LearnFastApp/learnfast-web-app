"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  BarChart2,
  CheckCircle,
  MessageSquare,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";
import type { OrgRole } from "@/types/enterprise";

const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  coach: "Coach",
  member: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-violet-400 bg-violet-400/10",
  admin: "text-blue-400 bg-blue-400/10",
  coach: "text-emerald-400 bg-emerald-400/10",
  member: "text-slate-400 bg-slate-400/10",
};

interface Overview {
  sessionsCount: number;
  scheduledCount: number;
  responsesCount: number;
  activeMembersCount: number;
  totalMembersCount: number;
}

interface MemberRow {
  id: string;
  displayName: string;
  email: string;
  role: string;
  sessionsCount: number;
  responsesCount: number;
  avgScores: Record<Dimension, number> | null;
  lastSessionAt: string | null;
}

interface AnalyticsData {
  overview: Overview;
  orgAvgScores: Record<Dimension, number> | null;
  members: MemberRow[];
}

interface OrgInfo {
  name: string;
}

function avgOfScores(scores: Record<Dimension, number> | null): string {
  if (!scores) return "—";
  const vals = DIMENSIONS.map((d) => scores[d]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return mean.toFixed(1);
}

function formatDate(iso: string | null): string {
  if (!iso) return "No sessions yet";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();
  const redirectingRef = useRef(false);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };

      const [analyticsRes, orgRes] = await Promise.all([
        fetch(`/api/org/${orgId}/analytics`, { headers }),
        fetch(`/api/org/${orgId}/info`, { headers }),
      ]);

      if (analyticsRes.status === 401) {
        router.replace("/auth/login");
        return;
      }
      if (analyticsRes.status === 403) {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.replace("/dashboard");
        }
        return;
      }

      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setAnalytics(d);
      } else {
        setError("Failed to load analytics.");
      }

      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgInfo(d);
      }
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orgId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, fetchData]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#0f172a] border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Unable to load</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  const overview = analytics?.overview;
  const orgAvgScores = analytics?.orgAvgScores ?? null;
  const members = (analytics?.members ?? []).slice().sort(
    (a, b) => b.sessionsCount - a.sessionsCount
  );

  const radarData = DIMENSIONS.map((d) => ({
    dimension: DIM_LABELS[d],
    value: orgAvgScores ? Number(orgAvgScores[d].toFixed(2)) : 0,
  }));

  return (
    <main className="min-h-screen bg-[#05070d]">
      <MobileNav />
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
            {orgInfo?.name ?? "Organisation"}
          </p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-slate-400" />
            Analytics
          </h1>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <a
              href={`/${orgId}/members`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Members
            </a>
            <a
              href={`/${orgId}/billing`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Billing
            </a>
            <a
              href={`/${orgId}/content`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Content
            </a>
            <a
              href={`/${orgId}/sessions`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Sessions
            </a>
            <a
              href={`/${orgId}/rehearse`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Rehearse
            </a>
            <span className="text-sm text-violet-400 font-medium">Analytics</span>
            <a
              href={`/${orgId}/my-sessions`}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              My sessions
            </a>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Sessions
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {overview?.sessionsCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">completed</p>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Feedback
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {overview?.responsesCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">responses</p>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Active
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {overview?.activeMembersCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">this month</p>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Scheduled
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {overview?.scheduledCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">upcoming</p>
          </div>
        </div>

        {/* Org radar chart */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-white mb-4">
            Team average scores
          </h2>
          {orgAvgScores !== null ? (
            <ResponsiveContainer width="100%" height={280}>
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
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-slate-500 text-sm">
                No completed sessions with feedback yet
              </p>
            </div>
          )}
        </div>

        {/* Team performance table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e293b]">
            <h2 className="text-sm font-semibold text-white">
              Team performance
            </h2>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#1e293b]">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Name
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
              Role
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
              Sessions
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
              Responses
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
              Avg score
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
              Last session
            </span>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-slate-500 text-sm">No team members found.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-4 flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:gap-4 sm:items-center gap-2"
                >
                  {/* Name / email */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.displayName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>

                  {/* Role */}
                  <div className="flex sm:justify-end">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                        ROLE_COLORS[m.role] ?? "text-slate-400 bg-slate-400/10"
                      }`}
                    >
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </div>

                  {/* Sessions */}
                  <div className="flex items-center justify-between sm:justify-end gap-1">
                    <span className="text-xs text-slate-500 sm:hidden">
                      Sessions
                    </span>
                    <span className="text-sm text-white font-medium">
                      {m.sessionsCount}
                    </span>
                  </div>

                  {/* Responses */}
                  <div className="flex items-center justify-between sm:justify-end gap-1">
                    <span className="text-xs text-slate-500 sm:hidden">
                      Responses
                    </span>
                    <span className="text-sm text-slate-300">
                      {m.responsesCount}
                    </span>
                  </div>

                  {/* Avg score */}
                  <div className="flex items-center justify-between sm:justify-end gap-1">
                    <span className="text-xs text-slate-500 sm:hidden">
                      Avg score
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        m.avgScores ? "text-violet-400" : "text-slate-500"
                      }`}
                    >
                      {avgOfScores(m.avgScores)}
                    </span>
                  </div>

                  {/* Last session */}
                  <div className="flex items-center justify-between sm:justify-end gap-1">
                    <span className="text-xs text-slate-500 sm:hidden">
                      Last session
                    </span>
                    <span className="text-xs text-slate-400 text-right">
                      {formatDate(m.lastSessionAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
