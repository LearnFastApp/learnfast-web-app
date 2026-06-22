"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, getDocs } from "firebase/firestore";
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
  Users,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import CreateSessionModal from "@/components/create-session-modal";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Session Calendar", icon: Calendar },
  { label: "Analytics", icon: BarChart3 },
  { label: "Learning Hub", icon: BookOpen },
  { label: "Settings", icon: Settings },
];

const resources = [
  "Executive Presence Mastery",
  "Strategic Communication for Modern Leaders",
  "Building High-Performance Teams",
  "The Art of Difficult Conversations",
];

interface Session {
  id: string;
  title: string;
  code: string;
  createdAt: { toDate: () => Date } | null;
  responseCount?: number;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading, router]);

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

      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0f1424] p-6 lg:flex lg:flex-col">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 font-bold">
              LF
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
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    item.active
                      ? "bg-violet-500/15 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </div>
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
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
            >
              <Plus className="h-5 w-5" />
              Create Session
            </button>
          </header>

          <div className="space-y-8 p-6 lg:p-8">
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
                    <a
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-violet-500/40 transition"
                    >
                      <p className="font-semibold mb-1">{s.title}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                      {s.createdAt && (
                        <p className="mt-3 text-xs text-slate-500">
                          {s.createdAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Featured resources */}
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Featured Learning Resources</h2>
                <p className="text-sm text-violet-300">View all resources →</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {resources.map((resource) => (
                  <div
                    key={resource}
                    className="rounded-xl border border-white/10 bg-[#1a2135] p-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/20 p-3 text-blue-300">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                        Resource
                      </span>
                    </div>
                    <h3 className="mb-2 font-bold">{resource}</h3>
                    <p className="text-sm text-slate-400">
                      Suggested based on your current feedback profile.
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 p-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-bold">Audience join link</h2>
                  <p className="text-slate-300">
                    Share <span className="font-mono text-violet-300">{window.location.origin}/join</span> or scan the QR from any active session.
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
