"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { collection, query, where, orderBy, limit, startAfter, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, getCountFromServer, QueryDocumentSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  Mic,
  LayoutDashboard,
  LogOut,
  PenLine,
  Plus,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import CreateSessionModal from "@/components/create-session-modal";
import CreateRehearsalModal from "@/components/create-rehearsal-modal";
import UpgradeModal from "@/components/upgrade-modal";
import MobileNav from "@/components/mobile-nav";
import OnboardingModal from "@/components/onboarding-modal";


interface Session {
  id: string;
  title: string;
  code: string;
  status: "active" | "closed";
  tags?: string[];
  createdAt: { toDate: () => Date } | null;
  commitment?: { dimension: string; text: string };
  commitmentReview?: { notes: string; skipped: boolean };
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

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [showModal, setShowModal] = useState(false);
  const [showRehearsalModal, setShowRehearsalModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "active" | "pilot">("free");
  const [pilotExpiresAt, setPilotExpiresAt] = useState<Date | null>(null);
  const [pilotOrgName, setPilotOrgName] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [extraSessions, setExtraSessions] = useState<Session[]>([]);
  const [lastSnapshotDoc, setLastSnapshotDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [extraLastDoc, setExtraLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"sessions" | "reflections" | "rehearsals">("sessions");
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [rehearsalSessions, setRehearsalSessions] = useState<{
    id: string; title: string; tags: string[]; takeCount: number;
    createdAt: { toDate: () => Date } | null;
  }[]>([]);
  const [rehearsalsLoading, setRehearsalsLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (!user.emailVerified) {
      signOut(auth).then(() => router.replace("/auth/login?unverified=1"));
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.locale === "fr") setLocale("fr");
        if (data.subscriptionStatus === "active") setSubscriptionStatus("active");
        if (data.subscriptionStatus === "pilot") {
          const expiry = data.pilotExpiresAt?.toDate?.() as Date | undefined;
          if (expiry && expiry > new Date()) {
            setSubscriptionStatus("pilot");
            setPilotExpiresAt(expiry);
            setPilotOrgName(data.pilotOrgName ?? null);
          }
        }
        if (!data.onboardingSeen) setShowOnboarding(true);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "sessions"),
      where("presenterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    return onSnapshot(q, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) })));
      setLastSnapshotDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      // Reset extra pages when first page refreshes (e.g. session deleted)
      setExtraSessions([]);
      setExtraLastDoc(null);
    });
  }, [user]);

  async function loadMore() {
    if (!user || loadingMore) return;
    const cursor = extraLastDoc ?? lastSnapshotDoc;
    if (!cursor) return;
    setLoadingMore(true);
    const snap = await getDocs(query(
      collection(db, "sessions"),
      where("presenterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(PAGE_SIZE)
    ));
    setExtraSessions((prev) => [
      ...prev,
      ...snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) })),
    ]);
    setExtraLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoadingMore(false);
  }

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

  const fetchRehearsalSessions = useCallback(() => {
    if (!user) return;
    setRehearsalsLoading(true);
    user.getIdToken().then((token) =>
      fetch("/api/rehearsal", { headers: { Authorization: `Bearer ${token}` } })
    ).then((r) => r.json()).then((data) => {
      setRehearsalSessions(data.sessions ?? []);
      setRehearsalsLoading(false);
    }).catch(() => setRehearsalsLoading(false));
  }, [user]);

  useEffect(() => {
    fetchRehearsalSessions();
  }, [fetchRehearsalSessions]);

  useEffect(() => {
    const allSessions = [...sessions, ...extraSessions];
    if (!allSessions.length) return;
    const missing = allSessions.filter((s) => responseCounts[s.id] === undefined);
    if (!missing.length) return;
    Promise.all(
      missing.map((s) =>
        getCountFromServer(query(collection(db, "feedback_responses"), where("sessionId", "==", s.id)))
          .then((snap) => ({ id: s.id, count: snap.data().count }))
      )
    ).then((counts) => {
      setResponseCounts((prev) => {
        const map = { ...prev };
        counts.forEach((c) => { map[c.id] = c.count; });
        return map;
      });
    }).catch(() => {});
  }, [sessions, extraSessions]); // eslint-disable-line react-hooks/exhaustive-deps

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
    signOut(auth).then(() => router.replace("/"));
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

  async function handleToggleLocale(newLocale: "en" | "fr") {
    if (newLocale === locale) return;
    setLocale(newLocale);
    if (user) {
      await updateDoc(doc(db, "presenters", user.uid), { locale: newLocale });
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-600 animate-pulse">Loading…</p>
      </main>
    );
  }

  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "Presenter";
  const isPaidOrPilot = subscriptionStatus === "active" || subscriptionStatus === "pilot";
  const pilotDaysLeft = pilotExpiresAt
    ? Math.max(0, Math.ceil((pilotExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isFr = locale === "fr";
  const ADMIN_UID = "zuFmYCIaGLViRSc7LXFwej6wql22";
  const canSeeLeaderboard = isPaidOrPilot || user.uid === ADMIN_UID;

  const navItems = [
    { label: isFr ? "Tableau de bord" : "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
    { label: isFr ? "Analytiques" : "Analytics", icon: BarChart3, href: "/analytics" },
    { label: isFr ? "Analyse IA" : "AI Analysis", icon: Brain, href: "/ai-assessment" },
    ...(canSeeLeaderboard ? [{ label: isFr ? "Classement" : "Leaderboard", icon: Trophy, href: "/leaderboard" }] : []),
    { label: isFr ? "Hub de ressources" : "Premium Resource Hub", icon: BookOpen, href: "#", comingSoon: true },
    { label: isFr ? "Paramètres" : "Settings", icon: Settings, href: "/settings" },
  ];
  const t = isFr ? {
    comingSoon: "Bientôt",
    pilotAccess: "Accès pilote",
    pilotDaysLeft: (n: number) => `${n} jour${n !== 1 ? "s" : ""} restant${n !== 1 ? "s" : ""} — accès complet à toutes les fonctionnalités.`,
    freePlan: "Plan gratuit",
    session: (n: number) => `Session ${n}`,
    freeSessionsExplore: "2 sessions gratuites pour découvrir LearnFast.",
    freeSession1Left: "1 session gratuite restante.",
    freeSessionsUsed: "Vous avez utilisé vos 2 sessions gratuites. Commencez votre essai de 7 jours pour continuer.",
    startTrial: "Commencer l'essai de 7 jours →",
    upgradeLite: "Passer à Lite — £3.99/mois",
    trialFree: "7 jours d'essai gratuit",
    cancelAnytime: "annulable à tout moment",
    presenter: "Présentateur",
    signOut: "Se déconnecter",
    pageTitle: "Tableau de bord",
    pageSubtitle: "Suivez vos retours de présentation et votre progression.",
    createSession: "Créer une session",
    usedBothFree: "Vous avez utilisé vos 2 sessions gratuites.",
    upgradeLiteShort: "Passer à Lite",
    tabSessions: "Sessions",
    tabReflections: "Réflexions",
    yourSessions: "Vos sessions",
    noSessionsYet: (cta: string) => <>Aucune session pour l&apos;instant — cliquez sur <strong className="text-slate-300">{cta}</strong> pour commencer.</>,
    live: "En direct",
    ended: "Terminée",
    responses: (n: number) => `${n} réponse${n !== 1 ? "s" : ""}`,
    deleteBtn: "Supprimer",
    loadMore: "Charger plus de sessions",
    loading: "Chargement…",
    reflectionLog: "Journal de réflexions",
    reflectionLogSub: "Vos scores auto-évalués sur toutes les sessions.",
    noReflections: "Aucune réflexion pour l'instant — évaluez-vous à la fin d'une session pour construire votre journal.",
    nextFocusPrefix: "Objectif — ",
    howItWent: "Comment ça s'est passé",
    joinLinkTitle: "Lien de participation",
    joinLinkDesc: "Partagez",
    joinLinkSuffix: "ou scannez le QR depuis n'importe quelle session active.",
  } : {
    comingSoon: "Coming Soon",
    pilotAccess: "Pilot Access",
    pilotDaysLeft: (n: number) => `${n} day${n !== 1 ? "s" : ""} remaining — full access to all features.`,
    freePlan: "Free Plan",
    session: (n: number) => `Session ${n}`,
    freeSessionsExplore: "2 free sessions to explore LearnFast.",
    freeSession1Left: "1 free session remaining.",
    freeSessionsUsed: "You've used both free sessions. Start your 7-day trial to continue.",
    startTrial: "Start 7-Day Free Trial →",
    upgradeLite: "Upgrade to Lite — £3.99/mo",
    trialFree: "7 day free trial",
    cancelAnytime: "cancel anytime",
    presenter: "Presenter",
    signOut: "Sign Out",
    pageTitle: "Dashboard",
    pageSubtitle: "Track presentation feedback and development progress.",
    createSession: "Create Session",
    usedBothFree: "You've used both free sessions.",
    upgradeLiteShort: "Upgrade to Lite",
    tabSessions: "Sessions",
    tabReflections: "Reflections",
    yourSessions: "Your sessions",
    noSessionsYet: (cta: string) => <>No sessions yet — hit <strong className="text-slate-300">{cta}</strong> to start.</>,
    live: "Live",
    ended: "Ended",
    responses: (n: number) => `${n} response${n !== 1 ? "s" : ""}`,
    deleteBtn: "Delete",
    loadMore: "Load more sessions",
    loading: "Loading…",
    reflectionLog: "Reflection log",
    reflectionLogSub: "Your self-assessed scores across all sessions.",
    noReflections: "No reflections yet — rate yourself at the end of a session to build your log.",
    nextFocusPrefix: "Next session focus — ",
    howItWent: "How it went",
    joinLinkTitle: "Audience join link",
    joinLinkDesc: "Share",
    joinLinkSuffix: "or scan the QR from any active session.",
  };

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleSessionCreated}
          locale={locale}
        />
      )}
      {showRehearsalModal && (
        <CreateRehearsalModal
          onClose={() => { setShowRehearsalModal(false); fetchRehearsalSessions(); }}
          locale={locale}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} locale={locale} />}
      {showOnboarding && (
        <OnboardingModal
          onClose={markOnboardingSeen}
          onCreateSession={() => { markOnboardingSeen(); setShowModal(true); }}
          locale={locale}
        />
      )}
      <MobileNav locale={locale} onCreateSession={() => {
        if (!isPaidOrPilot && sessions.length >= 2) {
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
              LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
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
                      {t.comingSoon}
                    </span>
                  )}
                </a>
              );
            })}
            {user?.email === "physicalperformance@icloud.com" && (
              <a
                href="/admin/pilot"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <ShieldCheck className="h-5 w-5" />
                <span className="flex-1">Pilot Admin</span>
              </a>
            )}
          </nav>

          {subscriptionStatus === "pilot" && (
            <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">{t.pilotAccess}</p>
              {pilotOrgName && <p className="text-xs text-slate-400 mb-2">{pilotOrgName}</p>}
              <p className="text-xs text-slate-300">
                {t.pilotDaysLeft(pilotDaysLeft)}
              </p>
            </div>
          )}

          {!isPaidOrPilot && (
            <div className={`mt-6 rounded-xl border p-4 ${sessions.length >= 2 ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-[#0a0d1a]"}`}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t.freePlan}</p>
              <div className="flex gap-2 mb-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex-1">
                    <div className={`h-1.5 rounded-full ${i < sessions.length ? (sessions.length >= 2 ? "bg-amber-400" : "bg-violet-500") : "bg-white/10"}`} />
                    <p className="text-[10px] text-slate-600 mt-1 text-center">{t.session(i + 1)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {sessions.length === 0 && t.freeSessionsExplore}
                {sessions.length === 1 && t.freeSession1Left}
                {sessions.length >= 2 && t.freeSessionsUsed}
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className={`w-full rounded-lg px-3 py-2.5 text-xs font-bold text-white transition ${sessions.length >= 2 ? "bg-amber-500 hover:bg-amber-400" : "bg-violet-500 hover:bg-violet-400"}`}
              >
                {sessions.length >= 2 ? t.startTrial : t.upgradeLite}
              </button>
              <p className="text-[10px] font-semibold text-slate-400 text-center mt-1.5">{t.trialFree}</p>
              <p className="text-[10px] text-slate-600 text-center">{t.cancelAnytime}</p>
            </div>
          )}

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/30 font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-slate-400">{t.presenter}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              {t.signOut}
            </button>
          </div>
        </aside>

        <section className="flex-1">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
              <p className="text-sm text-slate-400">
                {t.pageSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#0f1424] p-0.5">
                <button
                  onClick={() => handleToggleLocale("en")}
                  title="English"
                  className={`rounded-md px-1.5 py-0.5 text-lg leading-none transition ${locale === "en" ? "bg-white/15" : "opacity-30 hover:opacity-60"}`}
                >
                  🇬🇧
                </button>
                <button
                  onClick={() => handleToggleLocale("fr")}
                  title="Français"
                  className={`rounded-md px-1.5 py-0.5 text-lg leading-none transition ${locale === "fr" ? "bg-white/15" : "opacity-30 hover:opacity-60"}`}
                >
                  🇫🇷
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!isPaidOrPilot) { setShowUpgrade(true); } else { setShowRehearsalModal(true); }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-violet-500/40 px-4 py-3 text-sm font-semibold text-violet-300 hover:bg-violet-500/10 transition"
                  title="Rehearsal Mode"
                >
                  <span className="hidden sm:inline">{isFr ? "Répétition" : "Rehearse"}</span>
                  <span className="sm:hidden">🎙️</span>
                </button>
                <button
                  onClick={() => {
                    if (!isPaidOrPilot && sessions.length >= 2) {
                      setShowUpgrade(true);
                    } else {
                      setShowModal(true);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">{t.createSession}</span>
                </button>
              </div>
            </div>
          </header>

          {!isPaidOrPilot && sessions.length >= 2 && (
            <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-6 py-3 lg:px-8">
              <p className="text-sm text-amber-300">
                {t.usedBothFree}
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="rounded-lg bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 transition"
              >
                {t.upgradeLiteShort}
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
              {t.tabSessions}
            </button>
            <button
              onClick={() => setActiveTab("reflections")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${activeTab === "reflections" ? "border-cyan-400 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              <PenLine className="h-4 w-4" />
              {t.tabReflections}
              {reflections.length > 0 && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">{reflections.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("rehearsals")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${activeTab === "rehearsals" ? "border-violet-400 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              <Mic className="h-4 w-4" />
              {isFr ? "Répétitions" : "Rehearsals"}
              {rehearsalSessions.length > 0 && (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">{rehearsalSessions.length}</span>
              )}
            </button>
          </div>

          <div className="space-y-8 p-6 pb-24 lg:pb-8 lg:p-8">
            {activeTab === "sessions" ? (
              <section>
                <h2 className="mb-4 text-lg font-bold">{t.yourSessions}</h2>
                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                    {t.noSessionsYet(t.createSession)}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[...sessions, ...extraSessions].map((s) => (
                      <div
                        key={s.id}
                        className="group rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-violet-500/40 transition"
                      >
                        <a href={`/sessions/${s.id}`} className="block">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold leading-snug">{s.title}</p>
                            {s.status === "active" ? (
                              <span className="shrink-0 flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                {t.live}
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
                                {t.ended}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                            {responseCounts[s.id] !== undefined && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Users className="h-3 w-3" />
                                {t.responses(responseCounts[s.id])}
                              </span>
                            )}
                          </div>
                          {s.createdAt && (
                            <p className="mt-1.5 text-xs text-slate-600">
                              {s.createdAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
                          {t.deleteBtn}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/30 transition disabled:opacity-50"
                    >
                      {loadingMore ? t.loading : t.loadMore}
                    </button>
                  </div>
                )}

              </section>
            ) : activeTab === "reflections" ? (
              <section>
                <h2 className="mb-1 text-lg font-bold">{t.reflectionLog}</h2>
                <p className="mb-6 text-sm text-slate-400">{t.reflectionLogSub}</p>
                {reflectionsLoading ? (
                  <p className="text-slate-500 animate-pulse text-sm">{t.loading}</p>
                ) : reflections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                    {t.noReflections}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reflections.map((r) => {
                      const session = sessions.find((s) => s.id === r.sessionId);
                      return (
                        <a
                          key={r.sessionId}
                          href={`/sessions/${r.sessionId}`}
                          className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-cyan-500/30 transition"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                          </div>
                          {(session?.commitment?.text || (session?.commitmentReview?.notes && !session.commitmentReview.skipped)) && (
                            <div className="border-t border-white/5 pt-3 space-y-2.5">
                              {session?.commitment?.text && (
                                <div>
                                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">{t.nextFocusPrefix}{session.commitment.dimension}</p>
                                  <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{session.commitment.text}&rdquo;</p>
                                </div>
                              )}
                              {session?.commitmentReview?.notes && !session.commitmentReview.skipped && (
                                <div>
                                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">{t.howItWent}</p>
                                  <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{session.commitmentReview.notes}&rdquo;</p>
                                </div>
                              )}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : activeTab === "rehearsals" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">{isFr ? "Sessions de répétition" : "Rehearsal sessions"}</h2>
                  <button
                    onClick={() => isPaidOrPilot ? setShowRehearsalModal(true) : setShowUpgrade(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isFr ? "Nouvelle répétition" : "New rehearsal"}
                  </button>
                </div>
                {rehearsalsLoading ? (
                  <p className="text-sm text-slate-500 animate-pulse">{t.loading}</p>
                ) : rehearsalSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                    {isFr
                      ? <>Aucune répétition pour l&apos;instant — cliquez sur <strong className="text-slate-300">Nouvelle répétition</strong> pour commencer.</>
                      : <>No rehearsals yet — hit <strong className="text-slate-300">New rehearsal</strong> to start.</>}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {rehearsalSessions.map((r) => (
                      <a
                        key={r.id}
                        href={`/rehearse/${r.id}`}
                        className="group rounded-2xl border border-white/10 bg-[#111827] p-5 hover:border-violet-500/40 transition block"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold leading-snug">{r.title || (isFr ? "Répétition sans titre" : "Untitled rehearsal")}</p>
                          <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-400">
                            {r.takeCount} {isFr ? `prise${r.takeCount !== 1 ? "s" : ""}` : r.takeCount === 1 ? "take" : "takes"}
                          </span>
                        </div>
                        {r.createdAt && (
                          <p className="text-xs text-slate-600 mb-3">
                            {r.createdAt.toDate().toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {(r.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(r.tags ?? []).map((tag) => (
                              <span key={tag} className="flex items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                                <Tag className="h-3 w-3" />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-xs text-slate-600 group-hover:text-violet-400 transition">
                          {isFr ? "Continuer la répétition →" : "Continue rehearsing →"}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 p-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-bold">{t.joinLinkTitle}</h2>
                  <p className="text-slate-300">
                    {t.joinLinkDesc}{" "}
                    <a
                      href="/join"
                      className="font-mono text-violet-300 underline underline-offset-2 hover:text-violet-200"
                    >
                      {typeof window !== "undefined" ? window.location.origin : ""}/join
                    </a>
                    {" "}{t.joinLinkSuffix}
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
