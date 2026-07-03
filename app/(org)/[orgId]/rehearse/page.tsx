"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";
import { BookOpen, CheckCircle2, ChevronRight, Loader2, Mic, Plus } from "lucide-react";

interface RehearsalSession {
  id: string;
  title: string;
  status: string;
  takeCount: number;
  createdAt: string | null;
  promotedAssessmentId?: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [rehRes, orgRes] = await Promise.all([
        fetch("/api/rehearsal", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/org/${orgId}/info`, { headers: { Authorization: `Bearer ${token}` } }),
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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  const isPrivileged = myRole === "owner" || myRole === "admin" || myRole === "coach";

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d]">
      <MobileNav />
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          {orgName && (
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">{orgName}</p>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mic className="w-6 h-6 text-slate-400" />
              Rehearse
            </h1>
            <a
              href="/dashboard"
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              New rehearsal
            </a>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <a href={`/${orgId}/members`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Members</a>
            <a href={`/${orgId}/billing`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Billing</a>
            <a href={`/${orgId}/content`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Content</a>
            <a href={`/${orgId}/sessions`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Sessions</a>
            <span className="text-sm text-violet-400 font-medium">Rehearse</span>
            {isPrivileged && <a href={`/${orgId}/analytics`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Analytics</a>}
            <a href={`/${orgId}/my-sessions`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">My sessions</a>
          </div>
        </div>

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
            <a
              href="/dashboard"
              className="mt-2 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start first rehearsal
            </a>
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
  );
}
