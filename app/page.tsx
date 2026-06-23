"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  LayoutDashboard,
  LogOut,
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

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/", active: true },
  { label: "Session Calendar", icon: Calendar, href: "#", comingSoon: true },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Learning Hub", icon: BookOpen, href: "#", comingSoon: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];


interface Session {
  id: string;
  title: string;
  code: string;
  tags?: string[];
  createdAt: { toDate: () => Date } | null;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "active">("free");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) {
        const status = snap.data().subscriptionStatus;
        if (status === "active") setSubscriptionStatus("active");
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
      <MobileNav onCreateSession={() => {
        if (subscriptionStatus !== "active" && sessions.length >= 5) {
          setShowUpgrade(true);
        } else {
          setShowModal(true);
        }
      }} />

      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0f1424] p-6 lg:flex lg:flex-col">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl overflow-hidden bg-white px-2 py-1.5">
              <img src="/logo.png" alt="LearnFast" className="h-7 w-auto" />
            </div>
            <div>
              <p className="text-xl font-bold">LearnFast</p>
              <p className="text-xs text-slate-400">Feedback Intelligence</p>
            </div>
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

          <div className="space-y-8 p-6 pb-24 lg:pb-8 lg:p-8">
            {/* Recent sessions */}
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

                      {/* Tags */}
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
