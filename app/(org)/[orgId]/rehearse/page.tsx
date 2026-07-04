"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import CreateRehearsalModal from "@/components/create-rehearsal-modal";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  Mic,
  Plus,
  Trash2,
} from "lucide-react";

interface RehearsalSession {
  id: string;
  title: string;
  status: string;
  takeCount: number;
  createdAt: string | null;
  promotedAssessmentId?: string | null;
}

interface Assignment {
  id: string;
  assignedTo: string;
  assignedToName: string | null;
  assignedBy: string;
  assignedByName: string | null;
  title: string;
  prompt: string | null;
  dueDate: string | null;
  status: "pending" | "completed";
  completedAt: string | null;
  createdAt: string | null;
}

interface OrgMember {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function dueBadge(dueDate: string | null): { label: string; className: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  if (due < now) {
    return { label: "Overdue", className: "text-red-400 bg-red-400/10" };
  }
  return {
    label: `Due ${formatDate(dueDate)}`,
    className: "text-amber-400 bg-amber-400/10",
  };
}

export default function OrgRehearsePage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRehearsalModal, setShowRehearsalModal] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  // Coach create-assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignPrompt, setAssignPrompt] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Per-assignment action loading (complete / delete)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [rehRes, orgRes, assignRes, membersRes] = await Promise.all([
        fetch("/api/rehearsal", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/info`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/assignments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/members-list`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (rehRes.status === 401) { router.replace("/auth/login"); return; }
      if (orgRes.status === 403) { router.replace("/dashboard"); return; }
      if (rehRes.ok) {
        const d = await rehRes.json();
        setSessions(d.sessions ?? []);
      }
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgName(d.name ?? "");
        setMyRole(d.myRole ?? null);
      }
      if (assignRes.ok) {
        const d = await assignRes.json();
        setAssignments(d.assignments ?? []);
      }
      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, orgId, router]);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setAssignments(d.assignments ?? []);
      }
    } catch { /* ignore */ }
  }, [user, orgId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  const isPrivileged = myRole === "owner" || myRole === "admin" || myRole === "coach";

  const pendingAssignments = assignments.filter((a) => a.status === "pending");
  const completedAssignments = assignments.filter((a) => a.status === "completed");

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !assignTo || !assignTitle.trim()) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedTo: assignTo,
          title: assignTitle.trim(),
          prompt: assignPrompt.trim() || null,
          dueDate: assignDueDate || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAssignError(d.error ?? "Failed to create assignment.");
        return;
      }
      setAssignTo("");
      setAssignTitle("");
      setAssignPrompt("");
      setAssignDueDate("");
      setShowAssignForm(false);
      await fetchAssignments();
    } catch {
      setAssignError("Something went wrong. Please try again.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleMarkComplete(assignmentId: string) {
    if (!user) return;
    setActionLoading((prev) => ({ ...prev, [assignmentId]: true }));
    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? { ...a, status: "completed", completedAt: new Date().toISOString() }
          : a
      )
    );
    try {
      const token = await user.getIdToken();
      await fetch(`/api/org/${orgId}/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      });
    } catch {
      // Revert on failure
      await fetchAssignments();
    } finally {
      setActionLoading((prev) => ({ ...prev, [assignmentId]: false }));
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!user) return;
    setActionLoading((prev) => ({ ...prev, [assignmentId]: true }));
    // Optimistic update
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    try {
      const token = await user.getIdToken();
      await fetch(`/api/org/${orgId}/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert on failure
      await fetchAssignments();
    } finally {
      setActionLoading((prev) => ({ ...prev, [assignmentId]: false }));
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d]">
      <OrgSidebar orgName={orgName} myRole={myRole} />
      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mic className="w-6 h-6 text-slate-400" />
              AI Analysis
            </h1>
            <div className="flex items-center gap-2">
              {isPrivileged && (
                <button
                  onClick={() => { setShowAssignForm((v) => !v); setAssignError(null); }}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Assign rehearsal
                </button>
              )}
              <button
                onClick={() => setShowRehearsalModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                New rehearsal
              </button>
            </div>
          </div>
        </div>

        {/* Coach: Create-assignment form */}
        {isPrivileged && showAssignForm && (
          <div className="mb-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl px-5 py-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              New assignment
            </h2>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Member dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Assign to</label>
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="" disabled>Select member…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName ?? m.email ?? m.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Practice opening hook"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Prompt <span className="text-slate-600 font-normal">(optional)</span></label>
                <textarea
                  value={assignPrompt}
                  onChange={(e) => setAssignPrompt(e.target.value)}
                  placeholder="Give context or specific instructions for this rehearsal…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Due date <span className="text-slate-600 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {assignError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {assignError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={assigning}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-3.5 h-3.5" />
                      Create assignment
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAssignForm(false); setAssignError(null); }}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending assignments */}
        {pendingAssignments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Assignments</h2>
            <div className="space-y-3">
              {pendingAssignments.map((a) => {
                const badge = dueBadge(a.dueDate);
                const isLoading = actionLoading[a.id] ?? false;
                return (
                  <div
                    key={a.id}
                    className="bg-[#0f172a] border border-[#1e293b] rounded-2xl px-5 py-4"
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{a.title}</span>
                        {badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {isPrivileged && (
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          disabled={isLoading}
                          className="shrink-0 text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                          aria-label="Delete assignment"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Meta */}
                    <p className="text-xs text-slate-500 mb-2">
                      {isPrivileged
                        ? `Assigned to ${a.assignedToName ?? a.assignedTo}`
                        : `Assigned by ${a.assignedByName ?? "coach"}`}
                    </p>

                    {/* Prompt block */}
                    {a.prompt && (
                      <div className="bg-white/5 rounded-xl px-4 py-3 mb-3">
                        <p className="text-xs text-slate-300 italic leading-relaxed">{a.prompt}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {!isPrivileged && (
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => setShowRehearsalModal(true)}
                          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          Start rehearsal
                        </button>
                        <button
                          onClick={() => handleMarkComplete(a.id)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark complete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed assignments (collapsible) */}
        {completedAssignments.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setCompletedCollapsed((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 hover:text-slate-300 transition-colors"
            >
              {completedCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              Completed assignments ({completedAssignments.length})
            </button>

            {!completedCollapsed && (
              <div className="space-y-3">
                {completedAssignments.map((a) => {
                  const isLoading = actionLoading[a.id] ?? false;
                  return (
                    <div
                      key={a.id}
                      className="bg-[#0f172a]/60 border border-[#1e293b]/60 rounded-2xl px-5 py-4 opacity-60"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-300 line-through">{a.title}</span>
                        </div>
                        {isPrivileged && (
                          <button
                            onClick={() => handleDeleteAssignment(a.id)}
                            disabled={isLoading}
                            className="shrink-0 text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                            aria-label="Delete assignment"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {isPrivileged
                          ? `Assigned to ${a.assignedToName ?? a.assignedTo}`
                          : `Assigned by ${a.assignedByName ?? "coach"}`}
                        {a.completedAt ? ` · Completed ${formatDate(a.completedAt)}` : ""}
                      </p>
                      {a.prompt && (
                        <div className="bg-white/5 rounded-xl px-4 py-3 mt-3">
                          <p className="text-xs text-slate-500 italic leading-relaxed">{a.prompt}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Explainer */}
        <div className="mb-6 bg-violet-600/10 border border-violet-500/20 rounded-2xl px-5 py-4 flex gap-3">
          <BookOpen className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Rehearse your delivery before a live session. Record a take, get instant AI feedback across all five dimensions, and keep practising until you feel confident.
          </p>
        </div>

        {/* Session list */}
        {sessions.length === 0 ? (
          <div className="bg-[#0f172a] border border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center text-center gap-3">
            <Mic className="w-10 h-10 text-slate-600" />
            <p className="text-slate-300 font-semibold">No rehearsals yet</p>
            <p className="text-sm text-slate-500 max-w-xs">
              Click <strong className="text-slate-300">New rehearsal</strong> to record your first take and get AI coaching feedback.
            </p>
            <button
              onClick={() => setShowRehearsalModal(true)}
              className="mt-2 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start first rehearsal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/rehearse/${s.id}`}
                className="flex items-center justify-between bg-[#0f172a] border border-[#1e293b] rounded-2xl px-5 py-4 hover:border-violet-500/30 hover:bg-white/[0.02] transition-all group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{s.title}</span>
                    {s.promotedAssessmentId && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Promoted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {s.takeCount} {s.takeCount === 1 ? "take" : "takes"}
                    {s.createdAt ? ` · ${formatDate(s.createdAt)}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0 ml-4" />
              </a>
            ))}
          </div>
        )}
      </div>
      </main>
      {showRehearsalModal && (
        <CreateRehearsalModal
          onClose={() => { setShowRehearsalModal(false); fetchData(); }}
          maxRecordSeconds={1200}
        />
      )}
    </div>
  );
}
