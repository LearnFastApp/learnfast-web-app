"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Calendar, CalendarPlus, Clock, Download, Loader2, Pencil, Play,
  Plus, QrCode, Save, Trash2, Users, X, ChevronDown, Radio,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebase";
import type { OrgSessionType, OrgSessionStatus, OrgRole } from "@/types/enterprise";

interface OnboardingStatus {
  teamInvited: boolean;
  brandingSet: boolean;
  sessionScheduled: boolean;
  feedbackCollected: boolean;
}

interface OrgSession {
  id: string;
  title: string;
  type: OrgSessionType;
  presenterId: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  feedbackCode: string;
  feedbackUrl: string;
  linkedConsumerSessionId?: string | null;
  linkedConsumerCode?: string | null;
  status: OrgSessionStatus;
  orgId: string;
  copresenterIds?: string[];
  copresenters?: Array<{ uid: string; displayName: string }>;
}

const TYPE_LABELS: Record<OrgSessionType, string> = {
  presentation: "Presentation",
  rehearsal: "Rehearsal",
  meeting: "Meeting",
};

const STATUS_COLORS: Record<OrgSessionStatus, string> = {
  scheduled: "text-slate-400 bg-slate-400/10",
  live: "text-green-400 bg-green-400/10",
  completed: "text-violet-400 bg-violet-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

function formatDateTime(iso: string, timezone: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: timezone,
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
}

function buildICS(session: OrgSession): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date(session.scheduledStart);
  const end = new Date(session.scheduledEnd);
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LearnFast//EN",
    "BEGIN:VEVENT",
    `UID:${session.id}@learnfastapp.com`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${session.title}`,
    `DESCRIPTION:Audience feedback link: ${session.feedbackUrl}`,
    `URL:${session.feedbackUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalendarUrl(session: OrgSession): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${fmt(new Date(session.scheduledStart))}/${fmt(new Date(session.scheduledEnd))}`,
    details: `Audience feedback link: ${session.feedbackUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function outlookUrl(session: OrgSession): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: session.title,
    startdt: session.scheduledStart,
    enddt: session.scheduledEnd,
    body: `Audience feedback link: ${session.feedbackUrl}`,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

function downloadICS(session: OrgSession) {
  const blob = new Blob([buildICS(session)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// Counts audience responses from the consumer session's feedback_responses collection
function LiveCounter({ consumerSessionId }: { consumerSessionId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const q = query(
      collection(clientDb, "feedback_responses"),
      where("sessionId", "==", consumerSessionId),
    );
    const unsub = onSnapshot(q, (snap) => setCount(snap.size));
    return unsub;
  }, [consumerSessionId]);

  if (count === null) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Users className="w-3 h-3" />
      {count} {count === 1 ? "response" : "responses"}
    </span>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<OrgSession[]>([]);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<OrgSessionType>("presentation");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formTimezone, setFormTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; displayName: string; email: string }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [formCoPresenters, setFormCoPresenters] = useState<string[]>([]);

  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const redirectingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [sessRes, orgRes, onboardingRes] = await Promise.all([
        fetch(`/api/org/${orgId}/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/info`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/onboarding`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sessRes.status === 401) { router.replace("/auth/login"); return; }
      if (sessRes.status === 403) {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.replace("/dashboard");
        }
        return;
      }
      if (sessRes.ok) {
        const d = await sessRes.json();
        setSessions(d.sessions ?? []);
      }
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgName(d.name ?? "");
        setMyRole(d.myRole ?? null);
        setLogoUrl(d.logoUrl ?? null);
      }
      if (onboardingRes.ok) {
        const d = await onboardingRes.json();
        setOnboarding(d);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchSessions();
  }, [user, authLoading, fetchSessions]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!user || creating) return;
    setCreating(true);
    setFormError("");
    try {
      const scheduledStart = new Date(`${formDate}T${formStartTime}`).toISOString();
      const scheduledEnd = new Date(`${formDate}T${formEndTime}`).toISOString();
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: formTitle, type: formType, scheduledStart, scheduledEnd, timezone: formTimezone, copresenterUids: formCoPresenters }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to create session."); return; }
      setShowForm(false);
      setFormTitle(""); setFormDate(""); setFormStartTime("09:00"); setFormEndTime("10:00"); setFormCoPresenters([]);
      setExpandedId(data.id);
      await fetchSessions();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function goLive(session: OrgSession) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/org/${orgId}/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "live" }),
    });
    // Redirect presenter to the full consumer session page (reflection, AI upload, analysis all there)
    if (session.linkedConsumerSessionId) {
      router.push(`/sessions/${session.linkedConsumerSessionId}`);
    } else {
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: "live" } : s));
    }
  }

  async function editSession(
    session: OrgSession,
    patch: { title?: string; type?: OrgSessionType; scheduledStart?: string; scheduledEnd?: string; copresenterUids?: string[] },
  ): Promise<boolean> {
    if (!user) return false;
    const token = await user.getIdToken();
    const res = await fetch(`/api/org/${orgId}/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) await fetchSessions();
    return res.ok;
  }

  async function deleteSession(session: OrgSession) {
    if (!user || !confirm(`Delete "${session.title}"?`)) return;
    const token = await user.getIdToken();
    await fetch(`/api/org/${orgId}/sessions/${session.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  }

  const isAdmin = myRole === "owner" || myRole === "admin";
  const upcoming = sessions.filter((s) => s.status === "scheduled" || s.status === "live");
  const past = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  const today = new Date().toISOString().split("T")[0];

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} logoUrl={logoUrl} />
      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-slate-400" />
              Sessions
            </h1>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              if (orgMembers.length === 0) {
                setMembersLoading(true);
                user!.getIdToken().then(token =>
                  fetch(`/api/org/${orgId}/members-list`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d?.members) setOrgMembers(d.members.filter((m: { status: string }) => m.status === "active")); })
                    .finally(() => setMembersLoading(false))
                );
              }
            }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New session
          </button>
        </div>

        {/* Onboarding checklist — shown to admins until all steps complete */}
        {isAdmin && onboarding && !(onboarding.teamInvited && onboarding.brandingSet && onboarding.sessionScheduled && onboarding.feedbackCollected) && (
          <div className="mb-8 bg-[#0f172a] border border-violet-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-0.5">Getting started</p>
                <p className="text-sm text-slate-300">Complete these steps to get the most out of LearnFast Enterprise.</p>
              </div>
              <span className="text-xs text-slate-500">
                {[onboarding.teamInvited, onboarding.brandingSet, onboarding.sessionScheduled, onboarding.feedbackCollected].filter(Boolean).length} / 4
              </span>
            </div>
            <div className="space-y-2">
              {[
                { done: onboarding.teamInvited, label: "Invite your team", sub: "Add at least one colleague", href: `/${orgId}/members` },
                { done: onboarding.brandingSet, label: "Set your branding", sub: "Add your logo", href: `/${orgId}/settings` },
                { done: onboarding.sessionScheduled, label: "Schedule a session", sub: "Create your first session with a feedback link", href: "#" },
                { done: onboarding.feedbackCollected, label: "Collect first feedback", sub: "Run a live session and collect audience responses", href: "#" },
              ].map((step) => (
                <a
                  key={step.label}
                  href={step.done ? undefined : step.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                    step.done
                      ? "opacity-50 cursor-default"
                      : step.href === "#"
                      ? "bg-white/[0.03] cursor-default"
                      : "bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${
                    step.done
                      ? "border-emerald-500 bg-emerald-500/20"
                      : "border-slate-600"
                  }`}>
                    {step.done && (
                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? "line-through text-slate-500" : "text-white"}`}>{step.label}</p>
                    <p className="text-xs text-slate-600">{step.sub}</p>
                  </div>
                  {!step.done && step.href !== "#" && (
                    <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Create session form */}
        {showForm && (
          <div className="mb-8 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">Schedule a session</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createSession} className="space-y-4">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Session title *"
                required
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="relative">
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as OrgSessionType)}
                  className="w-full appearance-none bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="presentation">Presentation</option>
                  <option value="rehearsal">Rehearsal</option>
                  <option value="meeting">Meeting</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {/* Co-presenters */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Presenters <span className="text-slate-600">(optional)</span></label>
                {membersLoading ? (
                  <p className="text-xs text-slate-500">Loading members…</p>
                ) : orgMembers.length === 0 ? (
                  <p className="text-xs text-slate-500">No other members to add.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {orgMembers.map((m) => {
                      const selected = formCoPresenters.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setFormCoPresenters((prev) =>
                              selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            selected
                              ? "border-violet-500 bg-violet-500/20 text-violet-300"
                              : "border-white/10 bg-[#0a0f1a] text-slate-400 hover:text-white"
                          }`}
                        >
                          {m.displayName || m.email}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <input
                type="date"
                value={formDate}
                min={today}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End time</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {creating ? "Creating…" : "Schedule session"}
              </button>
            </form>
          </div>
        )}

        {/* Upcoming */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Upcoming & Live
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500 text-sm">
              No upcoming sessions — click <strong className="text-slate-300">New session</strong> to schedule one.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  orgId={orgId}
                  isAdmin={isAdmin}
                  isOwner={s.presenterId === user?.uid}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onGoLive={goLive}
                  onEdit={editSession}
                  onDelete={deleteSession}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Past</h2>
            <div className="space-y-2">
              {past.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  orgId={orgId}
                  isAdmin={isAdmin}
                  isOwner={s.presenterId === user?.uid}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  onGoLive={goLive}
                  onEdit={editSession}
                  onDelete={deleteSession}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}

function SessionCard({
  session, orgId, isAdmin, isOwner, expanded, onToggle, onGoLive, onEdit, onDelete,
}: {
  session: OrgSession;
  orgId: string;
  isAdmin: boolean;
  isOwner: boolean;
  expanded: boolean;
  onToggle: () => void;
  onGoLive: (s: OrgSession) => void;
  onEdit: (s: OrgSession, patch: { title?: string; type?: OrgSessionType; scheduledStart?: string; scheduledEnd?: string; copresenterUids?: string[] }) => Promise<boolean>;
  onDelete: (s: OrgSession) => void;
}) {
  const canManage = isAdmin || isOwner;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [editType, setEditType] = useState<OrgSessionType>(session.type);
  const [editDate, setEditDate] = useState(session.scheduledStart.split("T")[0]);
  const [editStartTime, setEditStartTime] = useState(
    new Date(session.scheduledStart).toTimeString().slice(0, 5),
  );
  const [editEndTime, setEditEndTime] = useState(
    new Date(session.scheduledEnd).toTimeString().slice(0, 5),
  );
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    const scheduledStart = new Date(`${editDate}T${editStartTime}`).toISOString();
    const scheduledEnd = new Date(`${editDate}T${editEndTime}`).toISOString();
    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setEditError("End time must be after start time.");
      setSaving(false);
      return;
    }
    const ok = await onEdit(session, { title: editTitle.trim(), type: editType, scheduledStart, scheduledEnd });
    setSaving(false);
    if (ok) setEditing(false);
    else setEditError("Failed to save. Please try again.");
  }

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{session.title}</span>
            {session.status === "live" && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">
                <Radio className="w-2.5 h-2.5" />
                LIVE
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[session.status]}`}>
              {session.status === "live" ? "Live" : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
            {session.copresenters && session.copresenters.length > 0 && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                +{session.copresenters.length} presenter{session.copresenters.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(session.scheduledStart, session.timezone)}
            </span>
            <span className="text-xs text-slate-600">{TYPE_LABELS[session.type]}</span>
            {session.linkedConsumerSessionId && (session.status === "live" || session.status === "scheduled") && (
              <LiveCounter consumerSessionId={session.linkedConsumerSessionId} />
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-[#1e293b] px-5 py-5 space-y-5">

          {/* Inline edit form */}
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="relative">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as OrgSessionType)}
                  className="w-full appearance-none bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="presentation">Presentation</option>
                  <option value="rehearsal">Rehearsal</option>
                  <option value="meeting">Meeting</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>
              {editError && <p className="text-xs text-red-400">{editError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !editTitle.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* QR + feedback code */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="bg-white p-3 rounded-xl flex-shrink-0">
                  <QRCodeSVG value={session.feedbackUrl} size={120} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Audience join code</p>
                  <p className="text-3xl font-bold text-white tracking-[0.2em] mb-2">{session.feedbackCode}</p>
                  <p className="text-xs text-slate-500 break-all mb-3">{session.feedbackUrl}</p>
                  <p className="text-xs text-slate-500">
                    Ask your audience to scan the QR or go to{" "}
                    <strong className="text-slate-300">learnfastapp.com/f/{session.feedbackCode}</strong>
                  </p>
                </div>
              </div>

              {/* Calendar actions */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Add to calendar</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadICS(session)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .ics
                  </button>
                  <a
                    href={googleCalendarUrl(session)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Google Calendar
                  </a>
                  <a
                    href={outlookUrl(session)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Outlook
                  </a>
                  <a
                    href={`/f/${session.feedbackCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Test link
                  </a>
                </div>
              </div>

              {/* Status controls */}
              <div className="flex flex-wrap gap-2 pt-1">
                {canManage && session.status === "scheduled" && session.linkedConsumerSessionId && (
                  <button
                    onClick={() => onGoLive(session)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Go live
                  </button>
                )}
                {session.linkedConsumerSessionId && (
                  <a
                    href={`/sessions/${session.linkedConsumerSessionId}`}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    {session.status === "live" ? "Manage session" : "View results"}
                  </a>
                )}
                {canManage && session.status === "scheduled" && (
                  <button
                    onClick={() => { setEditing(true); setEditError(""); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {isAdmin && session.status !== "cancelled" && session.status !== "completed" && (
                  <button
                    onClick={() => onDelete(session)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
