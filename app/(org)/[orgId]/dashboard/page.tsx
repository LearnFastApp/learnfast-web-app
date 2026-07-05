"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  BarChart2, Brain, BookOpen, CalendarDays, Loader2, Mic, ArrowRight,
  TrendingUp, MessageSquare, CheckCircle2, Circle, Users, Search,
  Settings, ChevronRight, Lock, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection";

const DIMENSION_COLOR: Record<Dimension, string> = {
  clarity: "bg-violet-500", energy: "bg-amber-500", engagement: "bg-cyan-500",
  understanding: "bg-emerald-500", connection: "bg-pink-500",
};
const ROLE_COLORS: Record<string, string> = {
  owner: "text-violet-400 bg-violet-400/10", admin: "text-blue-400 bg-blue-400/10",
  coach: "text-emerald-400 bg-emerald-400/10", member: "text-slate-400 bg-slate-400/10",
};
const DIMS: Dimension[] = ["clarity", "energy", "engagement", "understanding", "connection"];

interface MySession {
  id: string; title: string; status: string;
  scheduledStart: string | null; responsesCount: number;
  avgScores: Record<Dimension, number> | null;
}
interface DashData {
  sessions: MySession[]; overallAvg: Record<Dimension, number> | null;
  totalSessions: number; totalResponses: number;
}
interface RehearsalSession {
  id: string; title: string; takeCount: number; createdAt: string | null;
}
interface OnboardingStatus {
  teamInvited: boolean; brandingSet: boolean;
  sessionScheduled: boolean; feedbackCollected: boolean;
}
interface MemberRow {
  id: string; displayName: string; email: string; role: string;
  sessionsCount: number; responsesCount: number;
  avgScores: Record<Dimension, number> | null; lastSessionAt: string | null;
}
interface TeamOverview {
  sessionsCount: number; scheduledCount: number;
  responsesCount: number; activeMembersCount: number; totalMembersCount: number;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}
function overallMean(avg: Record<Dimension, number> | null) {
  if (!avg) return null;
  return (DIMS.reduce((s, d) => s + (avg[d] ?? 0), 0) / DIMS.length).toFixed(1);
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

// ─── Admin / owner view ──────────────────────────────────────────────────────

const PLATFORM_ADMIN = "physicalperformance@icloud.com";

function AdminDashboard({
  orgId, orgName, overview, members, onboarding, canViewIndividual,
}: {
  orgId: string; orgName: string;
  overview: TeamOverview | null; members: MemberRow[];
  onboarding: OnboardingStatus | null; canViewIndividual: boolean;
}) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.email === PLATFORM_ADMIN;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [members, search]);

  const onboardingComplete = onboarding
    ? onboarding.teamInvited && onboarding.brandingSet &&
      onboarding.sessionScheduled && onboarding.feedbackCollected
    : true;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Admin view</p>
        <h1 className="text-2xl font-bold">{orgName || "Team Dashboard"}</h1>
      </div>


      {/* Onboarding */}
      {onboarding && !onboardingComplete && (
        <div className="bg-[#0f172a] border border-violet-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Get started</p>
              <p className="text-xs text-slate-500 mt-0.5">Complete these steps to set up your organisation.</p>
            </div>
            <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              {[onboarding.teamInvited, onboarding.brandingSet, onboarding.sessionScheduled, onboarding.feedbackCollected].filter(Boolean).length} / 4
            </span>
          </div>
          <div className="space-y-3">
            {[
              { done: onboarding.teamInvited,       label: "Invite your team",          sub: "Add members via email invite",               href: `/${orgId}/members` },
              { done: onboarding.brandingSet,       label: "Add your logo",             sub: "Upload your brand mark in settings",          href: `/${orgId}/settings` },
              { done: onboarding.sessionScheduled,  label: "Schedule a session",        sub: "Create your first live feedback session",     href: `/${orgId}/sessions` },
              { done: onboarding.feedbackCollected, label: "Collect audience feedback", sub: "Share the QR or link during a live session",  href: `/${orgId}/sessions` },
            ].map(({ done, label, sub, href }) => (
              <a
                key={label}
                href={done ? undefined : href}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${done ? "opacity-50 cursor-default" : "hover:bg-white/[0.03] cursor-pointer"}`}
              >
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
                  : <Circle className="w-5 h-5 text-slate-600 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${done ? "line-through text-slate-500" : "text-white"}`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>
                {!done && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Team stats */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Team members",  value: overview.totalMembersCount },
            { label: "Sessions run",  value: overview.sessionsCount },
            { label: "Responses",     value: overview.responsesCount },
            { label: "Scheduled",     value: overview.scheduledCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Team member picker */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl mb-8 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[#1e293b]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold">Team performance</p>
            </div>
            <a href={`/${orgId}/analytics`} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Full analytics →
            </a>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              placeholder="Search team members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Member list */}
        {members.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No members yet</p>
            <a href={`/${orgId}/members`} className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block transition-colors">
              Invite your team →
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-500">No members match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {filtered.map((m) => {
              const mean = overallMean(m.avgScores);
              const rowContent = (
                <>
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-violet-300">
                        {m.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${ROLE_COLORS[m.role] ?? "text-slate-400 bg-slate-400/10"}`}>
                      {m.role}
                    </span>
                    <span className="text-xs text-slate-400 w-16 text-right">{m.sessionsCount} sessions</span>
                    <span className={`text-sm font-semibold w-10 text-right ${mean ? "text-violet-400" : "text-slate-600"}`}>
                      {mean ?? "—"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-700 shrink-0 ml-2" />
                </>
              );

              return canViewIndividual ? (
                <a
                  key={m.id}
                  href={`/${orgId}/members/${m.id}/performance`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {rowContent}
                </a>
              ) : (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  {rowContent}
                </div>
              );
            })}
          </div>
        )}

        {/* Locked state hint */}
        {!canViewIndividual && members.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1e293b] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <p className="text-xs text-slate-600">
              Individual performance tracking is off.{" "}
              <a href={`/${orgId}/settings`} className="text-violet-500 hover:text-violet-400 transition-colors">
                Enable in Settings →
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: `/${orgId}/analytics`,  icon: BarChart2,    label: "Team Analytics",  sub: "Scores & trends" },
          { href: `/${orgId}/sessions`,   icon: CalendarDays, label: "Sessions",        sub: "Schedule & manage" },
          { href: `/${orgId}/members`,    icon: Users,        label: "Members",         sub: "Manage your team" },
          { href: `/${orgId}/settings`,   icon: Settings,     label: "Settings",        sub: "Branding & privacy" },
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

      {isPlatformAdmin && (
        <div className="mt-3">
          <a
            href="/admin/coaches"
            className="flex items-start gap-3 bg-[#0f172a] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Admin Panel</p>
              <p className="text-xs text-slate-500 mt-0.5">Coaches &amp; applications</p>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Member / coach view ─────────────────────────────────────────────────────

function MemberDashboard({
  orgId, displayName, dash, rehearsals,
}: {
  orgId: string; displayName: string;
  dash: DashData | null; rehearsals: RehearsalSession[];
}) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.email === PLATFORM_ADMIN;
  const recentSessions = dash?.sessions.slice(0, 3) ?? [];
  const avg = dash?.overallAvg ?? null;
  const mean = overallMean(avg);

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">

      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold">{displayName || "Your dashboard"}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Sessions presented", value: dash?.totalSessions ?? 0 },
          { label: "Responses received",  value: dash?.totalResponses ?? 0 },
          { label: "Overall avg score",   value: mean ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

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
          <a href={`/${orgId}/my-sessions`} className="mt-5 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Full analytics <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold">Recent sessions</p>
            </div>
            <a href={`/${orgId}/my-sessions`} className="text-xs text-slate-500 hover:text-slate-300">View all →</a>
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
                    {s.scheduledStart && <p className="text-xs text-slate-500 mt-0.5">{formatDate(s.scheduledStart)}</p>}
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-xs text-slate-400">{s.responsesCount} responses</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold">AI rehearsals</p>
            </div>
            <a href={`/${orgId}/rehearse`} className="text-xs text-slate-500 hover:text-slate-300">View all →</a>
          </div>
          {rehearsals.length === 0 ? (
            <div className="text-center py-6">
              <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No rehearsals yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rehearsals.map((r) => (
                <a key={r.id} href={`/rehearse/${r.id}`} className="flex items-center justify-between hover:bg-white/[0.02] rounded-lg -mx-2 px-2 py-1 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    {r.createdAt && <p className="text-xs text-slate-500 mt-0.5">{formatDate(r.createdAt)}</p>}
                  </div>
                  <p className="ml-3 text-xs text-slate-400 shrink-0">{r.takeCount} {r.takeCount === 1 ? "take" : "takes"}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: `/${orgId}/sessions`,  icon: CalendarDays,  label: "Start a session",   sub: "Run live audience feedback" },
          { href: `/${orgId}/rehearse`,  icon: Brain,         label: "Start a rehearsal", sub: "Practice with AI feedback" },
          { href: `/${orgId}/community`, icon: MessageSquare, label: "Coaching feed",     sub: "See what your team is sharing" },
          { href: "/learning-hub",       icon: BookOpen,      label: "Resource hub",      sub: "Browse learning resources" },
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

      {isPlatformAdmin && (
        <div className="mt-3">
          <a
            href="/admin/coaches"
            className="flex items-start gap-3 bg-[#0f172a] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Admin Panel</p>
              <p className="text-xs text-slate-500 mt-0.5">Coaches &amp; applications</p>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrgDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [canViewIndividual, setCanViewIndividual] = useState(false);

  // Member/coach state
  const [dash, setDash] = useState<DashData | null>(null);
  const [rehearsals, setRehearsals] = useState<RehearsalSession[]>([]);

  // Admin state
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const h = { Authorization: `Bearer ${token}` };

      // Always fetch org info first to get role
      const orgRes = await fetch(`/api/org/${orgId}/info`, { headers: h });
      if (orgRes.status === 401) { router.replace("/auth/login"); return; }
      if (orgRes.status === 403) { router.replace("/dashboard"); return; }
      if (!orgRes.ok) return;

      const orgData = await orgRes.json();
      const role: string = orgData.myRole ?? "member";
      setOrgName(orgData.name ?? "");
      setMyRole(role);
      setLogoUrl(orgData.logoUrl ?? null);
      setCanViewIndividual(orgData.settings?.managerCanViewIndividualSessions === true);
      setDisplayName(user.displayName ?? user.email?.split("@")[0] ?? "");

      const isAdminOrAbove = role === "owner" || role === "admin";

      if (isAdminOrAbove) {
        const [analyticsRes, onboardRes] = await Promise.all([
          fetch(`/api/org/${orgId}/analytics`, { headers: h }),
          fetch(`/api/org/${orgId}/onboarding`, { headers: h }),
        ]);
        if (analyticsRes.ok) {
          const d = await analyticsRes.json();
          setOverview(d.overview ?? null);
          setMembers((d.members ?? []).slice().sort(
            (a: MemberRow, b: MemberRow) => (b.sessionsCount ?? 0) - (a.sessionsCount ?? 0)
          ));
        }
        if (onboardRes.ok) setOnboarding(await onboardRes.json());
      } else {
        const [myRes, rehRes] = await Promise.all([
          fetch(`/api/org/${orgId}/my-sessions`, { headers: h }),
          fetch("/api/rehearsal", { headers: h }),
        ]);
        if (myRes.ok) setDash(await myRes.json());
        if (rehRes.ok) { const d = await rehRes.json(); setRehearsals((d.sessions ?? []).slice(0, 3)); }
      }
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

  const isAdminOrAbove = myRole === "owner" || myRole === "admin";

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={logoUrl} />
      <main className="md:ml-60 pt-16 md:pt-0">
        {isAdminOrAbove ? (
          <AdminDashboard
            orgId={orgId}
            orgName={orgName}
            overview={overview}
            members={members}
            onboarding={onboarding}
            canViewIndividual={canViewIndividual}

          />
        ) : (
          <MemberDashboard
            orgId={orgId}
            displayName={displayName}
            dash={dash}
            rehearsals={rehearsals}

          />
        )}
      </main>
    </div>
  );
}
