"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Copy, Check, Users, PenLine, PlayCircle, TrendingUp, Lock, StopCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import PresenterReflectionModal from "@/components/presenter-reflection-modal";
import { generateGapInsight } from "@/lib/gap-insight";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface FeedbackResponse {
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
  comment?: string;
  anonymous?: boolean;
  commenterName?: string | null;
}

interface PresenterReflection {
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  engagement: "Engagement",
  energy: "Energy",
  understanding: "Understanding",
  connection: "Connection",
};

const RECOMMENDATIONS: Record<Dimension, { title: string; description: string }> = {
  clarity: {
    title: "Improving Clarity",
    description: "Your audience found it harder to follow your message. These resources will help you structure ideas and communicate with precision.",
  },
  engagement: {
    title: "Improving Engagement",
    description: "Your audience felt less captivated during this session. Explore these resources on audience engagement techniques.",
  },
  energy: {
    title: "Improving Energy",
    description: "Your energy levels could have been higher. These resources cover presence, vocal variety, and delivery techniques.",
  },
  understanding: {
    title: "Improving Understanding",
    description: "Some of your message didn't land as clearly as intended. These resources focus on explanation and knowledge transfer.",
  },
  connection: {
    title: "Improving Connection",
    description: "Building rapport with your audience is key. These resources will help you create stronger human connection when presenting.",
  },
};

function getLowestDimension(averages: Record<Dimension, number>): Dimension | null {
  const dims = Object.entries(averages) as [Dimension, number][];
  if (dims.every(([, v]) => v === 0)) return null;
  return dims.reduce((lowest, current) => current[1] < lowest[1] ? current : lowest)[0];
}

function getSecondLowestDimension(averages: Record<Dimension, number>): Dimension | null {
  const dims = (Object.entries(averages) as [Dimension, number][]).filter(([, v]) => v > 0);
  if (dims.length < 2) return null;
  const sorted = [...dims].sort((a, b) => a[1] - b[1]);
  return sorted[1][0];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<{ title: string; code: string } | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"active" | "closed">("active");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [reflection, setReflection] = useState<PresenterReflection | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [qrCopyFailed, setQrCopyFailed] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesSaveError, setNotesSaveError] = useState(false);
  const [resources, setResources] = useState<{
    videos: { videoId: string; title: string; channelTitle: string; thumbnail: string }[];
    tedTalks: { videoId: string; title: string; channelTitle: string; thumbnail: string }[];
    articles: { title: string; url: string; source: string }[];
  } | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [secondaryArticle, setSecondaryArticle] = useState<{ title: string; url: string; source: string } | null>(null);
  const [resourceTab, setResourceTab] = useState<"videos" | "ted" | "podcasts" | "articles">("videos");
  const [podcasts, setPodcasts] = useState<{ title: string; author: string; description: string; image: string; link: string }[]>([]);
  const [podcastsLoading, setPodcastsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "active">("free");
  const [savedCommitment, setSavedCommitment] = useState<{ dimension: Dimension; text: string } | null>(null);
  const [draftDimension, setDraftDimension] = useState<Dimension>("clarity");
  const [draftText, setDraftText] = useState("");
  const [commitmentSaving, setCommitmentSaving] = useState(false);
  const [commitmentSaved, setCommitmentSaved] = useState(false);
  const [prevAverages, setPrevAverages] = useState<Record<Dimension, number> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }

    getDoc(doc(db, "sessions", id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession({ title: data.title, code: data.code });
        if (data.status === "closed") setSessionStatus("closed");
        if (data.commitment) {
          setSavedCommitment({ dimension: data.commitment.dimension, text: data.commitment.text });
          setDraftDimension(data.commitment.dimension);
          setDraftText(data.commitment.text);
        }
      }
    });

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().subscriptionStatus === "active") {
        setSubscriptionStatus("active");
      }
    });

    const q = query(collection(db, "feedback_responses"), where("sessionId", "==", id));
    const unsubFeedback = onSnapshot(q, (snap) => {
      setResponses(snap.docs.map((d) => d.data() as FeedbackResponse));
    });

    const unsubReflection = onSnapshot(doc(db, "presenter_reflections", id), (snap) => {
      if (snap.exists()) setReflection(snap.data() as PresenterReflection);
    });

    const unsubNotes = onSnapshot(doc(db, "session_notes", id), (snap) => {
      if (snap.exists()) setNotes(snap.data().notes ?? "");
    });

    return () => { unsubFeedback(); unsubReflection(); unsubNotes(); };
  }, [id, user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(
      collection(db, "sessions"),
      where("presenterId", "==", user.uid),
      where("status", "==", "closed"),
      orderBy("createdAt", "desc"),
      limit(10)
    )).then(async (snap) => {
      const prev = snap.docs.find((d) => d.id !== id);
      if (!prev) return;
      const respSnap = await getDocs(query(collection(db, "feedback_responses"), where("sessionId", "==", prev.id)));
      const prevResponses = respSnap.docs.map((d) => d.data() as FeedbackResponse);
      if (!prevResponses.length) return;
      setPrevAverages(DIMENSIONS.reduce((acc, dim) => {
        const vals = prevResponses.map((r) => r[dim]).filter((v) => typeof v === "number");
        acc[dim] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        return acc;
      }, {} as Record<Dimension, number>));
    });
  }, [user, id]);

  const audienceAverages = DIMENSIONS.reduce(
    (acc, dim) => ({ ...acc, [dim]: average(responses.map((r) => r[dim])) }),
    {} as Record<Dimension, number>
  );

  const lowestDimension = getLowestDimension(audienceAverages);
  const secondLowestDimension = getSecondLowestDimension(audienceAverages);

  useEffect(() => {
    if (lowestDimension && !savedCommitment) setDraftDimension(lowestDimension);
  }, [lowestDimension, savedCommitment]);

  useEffect(() => {
    if (!lowestDimension) return;
    setResourcesLoading(true);
    fetch(`/api/resources?dimension=${lowestDimension}`)
      .then((r) => r.json())
      .then((data) => { setResources(data); setResourcesLoading(false); })
      .catch(() => setResourcesLoading(false));

    setPodcastsLoading(true);
    fetch(`/api/resources/podcasts?dimension=${lowestDimension}`)
      .then((r) => r.json())
      .then((data) => { setPodcasts(data.podcasts ?? []); setPodcastsLoading(false); })
      .catch(() => setPodcastsLoading(false));
  }, [lowestDimension]);

  useEffect(() => {
    if (!secondLowestDimension) return;
    fetch(`/api/resources?dimension=${secondLowestDimension}`)
      .then((r) => r.json())
      .then((data) => {
        const articles = data.articles as { title: string; url: string; source: string }[];
        if (articles?.length) setSecondaryArticle(articles[0]);
      })
      .catch(() => {});
  }, [secondLowestDimension]);

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    audience: audienceAverages[dim],
    presenter: reflection ? reflection[dim] : null,
    fullMark: 100,
  }));

  async function saveNotes() {
    try {
      await setDoc(doc(db, "session_notes", id), { notes, updatedAt: serverTimestamp() }, { merge: true });
      setNotesSaved(true);
      setNotesSaveError(false);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save notes:", e);
      setNotesSaveError(true);
      setTimeout(() => setNotesSaveError(false), 3000);
    }
  }

  async function endSession() {
    setEnding(true);
    await updateDoc(doc(db, "sessions", id), { status: "closed", endedAt: serverTimestamp() });
    setSessionStatus("closed");
    setShowEndConfirm(false);
    setEnding(false);
    // Fire-and-forget — don't block UI on email delivery
    fetch("/api/sessions/send-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    }).catch(() => {});

    // Prompt self-reflection immediately — before results are visible
    if (!reflection) setShowReflection(true);
  }

  async function saveCommitment() {
    if (!draftText.trim()) return;
    setCommitmentSaving(true);
    await updateDoc(doc(db, "sessions", id), {
      commitment: { dimension: draftDimension, text: draftText.trim(), setAt: serverTimestamp() },
    });
    setSavedCommitment({ dimension: draftDimension, text: draftText.trim() });
    setCommitmentSaving(false);
    setCommitmentSaved(true);
    setTimeout(() => setCommitmentSaved(false), 2000);
  }

  const feedbackUrl = session ? `${window.location.origin}/session/${session.code}` : "";

  function copyUrl() {
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading || !session) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {/* End session confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">End this session?</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Audience members will no longer be able to submit feedback. Your results are saved and you can still view them any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={endSession}
                disabled={ending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400 transition disabled:opacity-50"
              >
                {ending ? "Ending…" : "End session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReflection && user && (
        <PresenterReflectionModal
          sessionId={id}
          presenterId={user.uid}
          onClose={() => setShowReflection(false)}
          onSubmitted={() => setShowReflection(false)}
        />
      )}

      <header className="border-b border-white/10 bg-[#101523] px-6 py-5 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{session.title}</h1>
          <p className="text-xs text-slate-400">
            Code: <span className="font-mono font-bold text-white">{session.code}</span>
            {" · "}
            {sessionStatus === "closed"
              ? <span className="text-slate-500">● Session ended</span>
              : <span className="text-green-400">● Live</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4" />
            <span className="text-sm font-semibold text-white">{responses.length}</span>
          </div>
          <button
            onClick={() => setShowReflection(true)}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20"
          >
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">{reflection ? "Edit reflection" : "Rate yourself"}</span>
          </button>
          {sessionStatus === "active" && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
            >
              <StopCircle className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">End session</span>
            </button>
          )}
        </div>
      </header>

      {sessionStatus === "closed" && !reflection && (
        <div className="mx-6 mt-6 rounded-2xl border border-cyan-500/40 bg-cyan-500/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PenLine className="h-5 w-5 text-cyan-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Add your self-reflection</p>
              <p className="text-xs text-slate-400">Rate yourself before reading the audience scores to keep your assessment unbiased.</p>
            </div>
          </div>
          <button
            onClick={() => setShowReflection(true)}
            className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 transition"
          >
            Rate yourself →
          </button>
        </div>
      )}

      {sessionStatus === "closed" && (
        <div className="mx-6 mt-6 rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-500/10 to-blue-500/5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Session complete</p>
              <h2 className="text-lg font-bold text-white mb-1">
                {responses.length} response{responses.length !== 1 ? "s" : ""} collected
              </h2>
              <p className="text-sm text-slate-400">
                Your session has ended. Audience feedback is locked in — review your results below and get to work on what matters most.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {subscriptionStatus !== "active" ? (
                <a
                  href="/pricing"
                  className="inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition text-center"
                >
                  Unlock improvement resources →
                </a>
              ) : (
                <a
                  href="#recommended"
                  className="inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition text-center"
                >
                  View your resources →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 p-6 lg:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">

            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Live averages</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500 inline-block" />
                  <span className="text-slate-400">Audience</span>
                </span>
                {reflection && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block" />
                    <span className="text-slate-400">Your reflection</span>
                  </span>
                )}
              </div>
            </div>

            {responses.length === 0 && !reflection ? (
              <div className="flex h-64 items-center justify-center text-slate-500">
                Waiting for responses…
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "#94a3b8", fontSize: 13 }}
                    />
                    {responses.length > 0 && (
                      <Radar
                        name="Audience"
                        dataKey="audience"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    {reflection && (
                      <Radar
                        name="Your reflection"
                        dataKey="presenter"
                        stroke="#22d3ee"
                        fill="#22d3ee"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        strokeDasharray="5 3"
                      />
                    )}
                  </RadarChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-5 gap-3">
                  {DIMENSIONS.map((dim) => {
                    const delta = prevAverages && audienceAverages[dim] > 0 && prevAverages[dim] > 0
                      ? Math.round(audienceAverages[dim] - prevAverages[dim])
                      : null;
                    return (
                      <div key={dim} className="text-center">
                        <p className="text-xs text-slate-400 capitalize mb-1">{dim}</p>
                        <p className="text-xl font-bold text-violet-300">{audienceAverages[dim]}</p>
                        {delta !== null && delta !== 0 && (
                          <p className={`text-xs font-bold ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
                            {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
                          </p>
                        )}
                        {reflection && (
                          <p className="text-sm font-semibold text-cyan-400">{reflection[dim]}</p>
                        )}
                        <p className="text-xs text-slate-500">/100</p>
                      </div>
                    );
                  })}
                </div>

                {reflection && responses.length > 0 && (
                  <div className="mt-6 rounded-xl bg-[#1a2135] p-4">
                    <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Gap analysis</p>
                    <div className="grid grid-cols-5 gap-3">
                      {DIMENSIONS.map((dim) => {
                        const gap = reflection[dim] - audienceAverages[dim];
                        const color = gap > 0 ? "text-amber-400" : gap < 0 ? "text-green-400" : "text-slate-400";
                        return (
                          <div key={dim} className="text-center">
                            <p className="text-xs text-slate-500 capitalize mb-1">{dim}</p>
                            <p className={`text-sm font-bold ${color}`}>
                              {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Amber = you rated yourself higher than the audience · Green = audience rated you higher
                    </p>
                    <p className="mt-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4">
                      {generateGapInsight(audienceAverages, reflection)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {responses.some((r) => r.comment) && (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Audience comments</p>
              <div className="space-y-3">
                {responses
                  .filter((r) => r.comment)
                  .map((r, i) => (
                    <div key={i} className="rounded-xl bg-[#1a2135] px-4 py-3">
                      <p className="text-sm text-slate-200 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {r.anonymous || !r.commenterName ? "Anonymous" : r.commenterName}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Presenter notes</p>
            <p className="text-xs text-slate-500 mb-3">Record anything you noticed during the session — energy shifts, questions that landed, moments to revisit.</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="e.g. Lost the room around the 10-min mark, picked up again after the example…"
              className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 resize-none mb-3"
            />
            <button
              onClick={saveNotes}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition"
            >
              {notesSaved ? (
                <><span className="text-green-400">✓</span> Saved</>
              ) : notesSaveError ? (
                <><span className="text-red-400">✕</span> Save failed — check connection</>
              ) : "Save notes"}
            </button>
          </div>
          {sessionStatus === "closed" && responses.length > 0 && (
            <div className="rounded-2xl border border-violet-500/20 bg-[#111827] p-6">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Next session focus</p>
              <p className="text-xs text-slate-500 mb-4">Commit to one area to improve before your next session.</p>
              {savedCommitment ? (
                <div>
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 mb-3">
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1 capitalize">
                      {DIMENSION_LABELS[savedCommitment.dimension]}
                    </p>
                    <p className="text-sm text-white leading-relaxed">{savedCommitment.text}</p>
                  </div>
                  <button
                    onClick={() => { setSavedCommitment(null); setDraftText(""); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    Change commitment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={draftDimension}
                    onChange={(e) => setDraftDimension(e.target.value as Dimension)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                  >
                    {DIMENSIONS.map((d) => (
                      <option key={d} value={d} className="bg-[#1a2135]">
                        {DIMENSION_LABELS[d]}{lowestDimension === d ? " (weakest)" : ""}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={3}
                    placeholder="e.g. I'll practise my opening without notes to improve eye contact and energy…"
                    className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 resize-none"
                  />
                  <button
                    onClick={saveCommitment}
                    disabled={!draftText.trim() || commitmentSaving}
                    className="w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
                  >
                    {commitmentSaving ? "Saving…" : commitmentSaved ? "✓ Committed!" : "Set my focus →"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {lowestDimension && responses.length > 0 && (() => {
            const rec = RECOMMENDATIONS[lowestDimension];
            return (
              <div id="recommended" className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-[#111827] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">
                    Recommended focus
                  </h2>
                </div>
                <p className="mb-1 font-bold text-white">{rec.title}</p>
                <p className="mb-4 text-xs text-slate-400 leading-relaxed">{rec.description}</p>

                {resourcesLoading && (
                  <p className="text-xs text-slate-500 animate-pulse">Finding resources…</p>
                )}

                {!resourcesLoading && resources && (
                  <div className="relative">
                    <div className={subscriptionStatus !== "active" ? "blur-[2px] pointer-events-none select-none" : ""}>
                      <div className="grid grid-cols-4 rounded-lg border border-white/10 bg-[#0f1424] p-0.5 mb-3">
                        {(["videos", "ted", "podcasts", "articles"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setResourceTab(tab)}
                            className={`rounded-md py-1.5 text-xs font-semibold transition ${
                              resourceTab === tab
                                ? "bg-violet-500 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {tab === "videos" ? "Videos" : tab === "ted" ? "TED" : tab === "podcasts" ? "Podcasts" : "Read"}
                          </button>
                        ))}
                      </div>

                      {(resourceTab === "videos" || resourceTab === "ted") && (
                        <div className="space-y-2">
                          {(resourceTab === "videos" ? resources.videos : resources.tedTalks).map((video) => (
                            <a
                              key={video.videoId}
                              href={`https://www.youtube.com/watch?v=${video.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#1a2135] p-3 hover:border-violet-500/40 transition"
                            >
                              {video.thumbnail && (
                                <img src={video.thumbnail} alt="" className="w-20 h-12 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-slate-200 leading-snug line-clamp-2 mb-1">{video.title}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <PlayCircle className="h-3 w-3 text-violet-400" />
                                  {video.channelTitle}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {resourceTab === "podcasts" && (
                        <div className="space-y-2">
                          {podcastsLoading && (
                            <p className="text-xs text-slate-500 animate-pulse">Finding podcasts…</p>
                          )}
                          {!podcastsLoading && podcasts.map((pod) => (
                            <a
                              key={pod.link}
                              href={pod.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#1a2135] p-3 hover:border-violet-500/40 transition"
                            >
                              {pod.image && (
                                <img src={pod.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-slate-200 leading-snug line-clamp-1 mb-0.5 font-semibold">{pod.title}</p>
                                <p className="text-xs text-violet-400 mb-1">{pod.author}</p>
                                <p className="text-xs text-slate-500 line-clamp-2">{pod.description}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {resourceTab === "articles" && (
                        <div className="space-y-2">
                          {resources.articles.map((article) => (
                            <a
                              key={article.url}
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col gap-1 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 hover:border-violet-500/40 transition"
                            >
                              <p className="text-xs text-slate-200 leading-snug line-clamp-2">{article.title}</p>
                              <p className="text-xs text-slate-500">{article.source}</p>
                            </a>
                          ))}
                        </div>
                      )}

                      <p className="mt-3 text-xs text-slate-500 text-center">
                        Based on lowest audience score · {DIMENSION_LABELS[lowestDimension]}: {audienceAverages[lowestDimension]}/100
                      </p>
                    </div>

                    {subscriptionStatus !== "active" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[#0f1424]/60">
                        <Lock className="h-5 w-5 text-violet-400 mb-2" />
                        <p className="text-sm font-semibold text-white mb-1">Unlock learning resources</p>
                        <p className="text-xs text-slate-400 text-center mb-4 px-6 leading-relaxed">
                          Videos, TED talks, podcasts & articles matched to your session results
                        </p>
                        <a
                          href="/pricing"
                          className="inline-block rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 transition"
                        >
                          Upgrade to Lite →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {secondLowestDimension && secondaryArticle && responses.length > 0 && subscriptionStatus === "active" && (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Also worth working on · {DIMENSION_LABELS[secondLowestDimension]}: {audienceAverages[secondLowestDimension]}/100
                </p>
              </div>
              <a
                href={secondaryArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0f1424] px-4 py-3 hover:border-violet-500/40 transition group"
              >
                <div>
                  <p className="text-sm text-slate-200 leading-snug mb-1 group-hover:text-white transition">{secondaryArticle.title}</p>
                  <p className="text-xs text-slate-500">{secondaryArticle.source}</p>
                </div>
                <span className="text-slate-600 group-hover:text-violet-400 transition shrink-0 mt-0.5">→</span>
              </a>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Share with audience
            </h2>
            <div className="flex justify-center rounded-xl bg-white p-4 mb-4">
              <QRCodeCanvas value={feedbackUrl} size={160} id="qr-display" />
            </div>
            {/* Hidden high-res canvas for download */}
            <div className="hidden">
              <QRCodeCanvas value={feedbackUrl} size={1024} id="qr-download" />
            </div>
            <div className="rounded-xl bg-[#1a2135] px-4 py-3 text-center mb-3">
              <p className="text-xs text-slate-400 mb-1">Code</p>
              <p className="text-2xl font-bold tracking-widest">{session.code}</p>
            </div>
            <button
              onClick={async () => {
                const canvas = document.getElementById("qr-download") as HTMLCanvasElement;
                if (!canvas) return;
                setQrCopyFailed(false);
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      "image/png": new Promise<Blob>((resolve, reject) =>
                        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("no blob")), "image/png")
                      ),
                    }),
                  ]);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                } catch {
                  setQrCopyFailed(true);
                  setTimeout(() => setQrCopyFailed(false), 3000);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition mb-2"
            >
              {qrCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {qrCopied ? "QR image copied!" : qrCopyFailed ? "Copy not supported — use Download" : "Copy QR image"}
            </button>
            <button
              onClick={() => {
                const canvas = document.getElementById("qr-download") as HTMLCanvasElement;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `learnfast-${session.code}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 mb-2"
            >
              Download QR (PNG)
            </button>
            <button
              onClick={copyUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy join link"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
