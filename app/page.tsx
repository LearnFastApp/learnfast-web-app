"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  LayoutDashboard,
  LogOut,
  PenLine,
  Plus,
  Settings,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import CreateSessionModal from "@/components/create-session-modal";
import UpgradeModal from "@/components/upgrade-modal";
import MobileNav from "@/components/mobile-nav";
import OnboardingModal from "@/components/onboarding-modal";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/", active: true },
  { label: "Session Calendar", icon: Calendar, href: "#", comingSoon: true },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Premium Resource Hub", icon: BookOpen, href: "#", comingSoon: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];


interface Session {
  id: string;
  title: string;
  code: string;
  tags?: string[];
  createdAt: { toDate: () => Date } | null;
}

interface ReflectionEntry {
  sessionId: string;
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
  submittedAt: { toDate: () => Date } | null;
}

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
const DIM_LABELS: Record<string, string> = {
  clarity: "Clarity", engagement: "Engagement", energy: "Energy",
  understanding: "Understanding", connection: "Connection",
};

function scoreBadgeClass(score: number) {
  if (score <= 40) return "bg-red-500/15 text-red-400";
  if (score <= 60) return "bg-amber-500/15 text-amber-400";
  if (score <= 80) return "bg-blue-500/15 text-blue-400";
  return "bg-green-500/15 text-green-400";
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "active">("free");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"sessions" | "reflections">("sessions");
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.subscriptionStatus === "active") setSubscriptionStatus("active");
        if (!data.onboardingSeen) setShowOnboarding(true);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "sessions"),
      where("presenterId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setSessions(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) }))
      );
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setReflectionsLoading(true);
    getDocs(query(
      collection(db, "presenter_reflections"),
      where("presenterId", "==", user.uid)
    )).then((snap) => {
      const entries = snap.docs
        .map((d) => ({ sessionId: d.id, ...(d.data() as Omit<ReflectionEntry, "sessionId">) }))
        .sort((a, b) => {
          const aTime = a.submittedAt?.toDate().getTime() ?? 0;
          const bTime = b.submittedAt?.toDate().getTime() ?? 0;
          return bTime - aTime;
        });
      setReflections(entries);
      setReflectionsLoading(false);
    }).catch(() => setReflectionsLoading(false));
  }, [user]);

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    await deleteDoc(doc(db, "sessions", sessionId));
  }

  async function handleAddTag(sessionId: string, currentTags: string[]) {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || currentTags.includes(tag)) { setTagInput(""); return; }
    await updateDoc(doc(db, "sessions", sessionId), { tags: [...currentTags, tag] });
    setTagInput("");
  }

  async function handleRemoveTag(sessionId: string, currentTags: string[], tag: string) {
    await updateDoc(doc(db, "sessions", sessionId), { tags: currentTags.filter((t) => t !== tag) });
  }

  function handleSignOut() {
    signOut(auth).then(() => router.replace("/auth/login"));
  }

  async function markOnboardingSeen() {
    setShowOnboarding(false);
    if (user) {
      await updateDoc(doc(db, "presenters", user.uid), { onboardingSeen: true });
    }
  }

  function handleSessionCreated(sessionId: string) {
    setShowModal(false);
    router.push(`/sessions/${sessionId}`);
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "Presenter";

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleSessionCreated}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      {showOnboarding && (
        <OnboardingModal
          onClose={markOnboardingSeen}
          onCreateSession={() => { markOnboardingSeen(); setShowModal(true); }}
        />
      )}
      <MobileNav onCreateSession={() => {
        if (subscriptionStatus !== "active" && sessions.length >= 5) {
          setShowUpgrade(true);
        } else {
          setShowModal(true);
        }
      }} />

      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0f1424] p-6 lg:flex lg:flex-col">
          <div className="mb-12 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
            <Image src="/icon-mark.png" alt="" width={80} height={58} className="row-span-2 self-center" priority />
            <p className="self-end leading-none text-[1.35rem] font-bold tracking-tight" style={{ color: '#5bb8f5' }}>
              LEARN<span className="font-light">FAST</span>
            </p>
            <p className="self-start text-sm text-slate-400 leading-tight">Feedback Intelligence</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    item.active
                      ? "bg-violet-500/15 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.comingSoon && (
                    <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
                      Coming Soon
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/30 font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-slate-400">Presenter</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        <section className="flex-1">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-400">
                Track presentation feedback and development progress.
              </p>
            </div>

            <button
              onClick={() => {
                if (subscriptionStatus !== "active" && sessions.length >= 5) {
                  setShowUpgrade(true);
                } else {
                  setShowModal(true);
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
            >
              <Plus className="h-5 w-5" />
              Create Session
            </button>
          </header>

          {subscriptionStatus !== "active" && sessions.length >= 5 && (
            <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-6 py-3 lg:px-8">
              <p className="text-sm text-amber-300">
                You&apos;ve used both your free sessions.
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="rounded-lg bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 transition"
              >
                Upgrade to Lite
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/10 px-6 lg:px-8 pt-6">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${activeTab === "sessions" ? "border-violet-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Sessions
            </button>
            <button
              onClick={() => setActiveTab("reflections")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${activeTab === "reflections" ? "border-cyan-400 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              <PenLine className="h-4 w-4" />
              Reflections
              {reflections.length > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">{reflections.length}</span>
              )}
            </button>
          </div>

          <div className="space-y-8 p-6 pb-24 lg:pb-8 lg:p-8">
            {activeTab === "sessions" ? (
              <section>
                <h2 className="mb-4 text-lg font-bold">Your sessions</h2>
                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                    No sessions yet — hit <strong className="text-slate-300">Create Session</strong> to start.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="group rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-violet-500/40 transition"
                      >
                        <a href={`/sessions/${s.id}`} className="block">
                          <p className="font-semibold mb-1">{s.title}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                          {s.createdAt && (
                            <p className="mt-2 text-xs text-slate-500">
                              {s.createdAt.toDate().toLocaleDateString()}
                            </p>
                          )}
                        </a>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(s.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="group/tag flex items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(s.id, s.tags ?? [], tag)}
                                className="ml-0.5 opacity-0 group-hover/tag:opacity-100 hover:text-white transition"
                              >×</button>
                            </span>
                          ))}
                          {editingTagsId === s.id ? (
                            <input
                              autoFocus
                              type="text"
                              placeholder="add tag…"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddTag(s.id, s.tags ?? []); }
                                if (e.key === "Escape") { setEditingTagsId(null); setTagInput(""); }
                              }}
                              onBlur={() => { handleAddTag(s.id, s.tags ?? []); setEditingTagsId(null); }}
                              className="rounded-lg border border-violet-500/40 bg-[#1a2135] px-2 py-0.5 text-xs text-white outline-none w-24"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingTagsId(s.id); setTagInput(""); }}
                              className="rounded-lg border border-dashed border-white/20 px-2 py-0.5 text-xs text-slate-600 hover:text-slate-300 hover:border-white/40 transition opacity-0 group-hover:opacity-100"
                            >
                              + tag
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section>
                <h2 className="mb-1 text-lg font-bold">Reflection log</h2>
                <p className="mb-6 text-sm text-slate-400">Your self-assessed scores across all sessions.</p>
                {reflectionsLoading ? (
                  <p className="text-slate-500 animate-pulse text-sm">Loading…</p>
                ) : reflections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                    No reflections yet — rate yourself at the end of a session to build your log.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reflections.map((r) => {
                      const session = sessions.find((s) => s.id === r.sessionId);
                      return (
                        <a
                          key={r.sessionId}
                          href={`/sessions/${r.sessionId}`}
                          className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-cyan-500/30 transition sm:flex-row sm:items-center"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{session?.title ?? "Session"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {r.submittedAt ? r.submittedAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {DIMENSIONS.map((dim) => (
                              <span key={dim} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${scoreBadgeClass(r[dim])}`}>
                                <span className="text-white/50 font-normal">{DIM_LABELS[dim].slice(0, 3)} </span>{r[dim]}
                              </span>
                            ))}
                          </div>
                          <span className="hidden sm:block text-slate-600 group-hover:text-cyan-400 transition shrink-0">→</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>
            )}


            <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 p-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-bold">Audience join link</h2>
                  <p className="text-slate-300">
                    Share{" "}
                    <a
                      href="/join"
                      className="font-mono text-violet-300 underline underline-offset-2 hover:text-violet-200"
                    >
                      {typeof window !== "undefined" ? window.location.origin : ""}/join
                    </a>
                    {" "}or scan the QR from any active session.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
