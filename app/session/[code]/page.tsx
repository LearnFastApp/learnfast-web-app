"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  engagement: "Engagement",
  energy: "Energy",
  understanding: "Understanding",
  connection: "Connection",
};

const NARRATIVES: Record<Dimension, { max: number; text: string }[]> = {
  clarity: [
    { max: 40, text: "I struggled to get my points across clearly and often felt my explanations were potentially confusing or unclear." },
    { max: 60, text: "I was able to express some of my points clearly, but there were moments where I think I could have been more concise or precise." },
    { max: 80, text: "Most of my points were well-articulated and clear, with only a few areas needing more polish." },
    { max: 100, text: "My ideas were communicated with clarity and precision, leaving little room for misunderstanding." },
  ],
  understanding: [
    { max: 40, text: "I feel I did not fully convey my message, and the audience likely struggled to follow my train of thought." },
    { max: 60, text: "I made an effort to explain my points, but there were gaps in ensuring the audience truly grasped my message." },
    { max: 80, text: "I made my points comprehensible, and I believe the audience understood the majority of what I was saying." },
    { max: 100, text: "I think the group fully understood my message and ideas throughout the presentation." },
  ],
  energy: [
    { max: 40, text: "I think I came across as low-energy, and my presentation lacked enthusiasm or drive." },
    { max: 60, text: "My energy levels were moderate, but there were moments when I could have been more engaging." },
    { max: 80, text: "I think I delivered with good energy, keeping the tone lively and engaging for most of the presentation." },
    { max: 100, text: "I felt my energy was vibrant and consistent, fully capturing and maintaining attention throughout." },
  ],
  connection: [
    { max: 40, text: "I think I struggled to establish any meaningful connection with the group, and the interaction felt distant." },
    { max: 60, text: "I managed some connection with the group, but I could have done more to build rapport." },
    { max: 80, text: "I think I connected well with the group and built a reasonable level of rapport and interaction." },
    { max: 100, text: "I felt that I created a strong connection with the group and fostered a sense of trust and engagement." },
  ],
  engagement: [
    { max: 40, text: "The group seemed disengaged, and I did little to actively involve or captivate them." },
    { max: 60, text: "The group was somewhat engaged, though there were opportunities to involve them more actively." },
    { max: 80, text: "The group appeared engaged, and I think I succeeded in keeping their attention for most of the presentation." },
    { max: 100, text: "The group seemed highly engaged, actively participating and attentive throughout the presentation." },
  ],
};

const BAND_LABELS: Record<string, { label: string; color: string }> = {
  poor:      { label: "Poor",      color: "text-red-400" },
  okay:      { label: "Okay",      color: "text-amber-400" },
  good:      { label: "Good",      color: "text-blue-400" },
  excellent: { label: "Excellent", color: "text-green-400" },
};

function getBand(score: number) {
  if (score <= 40) return "poor";
  if (score <= 60) return "okay";
  if (score <= 80) return "good";
  return "excellent";
}

function getNarrative(dim: Dimension, score: number): string {
  const bands = NARRATIVES[dim];
  return bands.find((b) => score <= b.max)?.text ?? bands[bands.length - 1].text;
}

function randomAnonId() {
  return Math.random().toString(36).substring(2, 14);
}

export default function FeedbackPage() {
  const { code } = useParams<{ code: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [scores, setScores] = useState<Record<Dimension, number>>({
    clarity: 50,
    engagement: 50,
    energy: 50,
    understanding: 50,
    connection: 50,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const q = query(
        collection(db, "sessions"),
        where("code", "==", code.toUpperCase()),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      if (snap.empty) { setNotFound(true); return; }
      const docSnap = snap.docs[0];
      setSessionId(docSnap.id);
      setSessionTitle(docSnap.data().title ?? "");
    }
    loadSession();
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setSubmitting(true);
    await addDoc(collection(db, "feedback_responses"), {
      sessionId,
      ...scores,
      submittedAt: serverTimestamp(),
      anonId: randomAnonId(),
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Session not found</h1>
          <p className="text-slate-400">Check the code and try again.</p>
          <a href="/join" className="mt-6 inline-block text-violet-400 underline">Enter a different code</a>
        </div>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading session…</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Thanks!</h1>
          <p className="text-slate-400">Your feedback has been recorded. It helps the presenter improve.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 font-bold mx-auto">
            LF
          </div>
          <h1 className="text-xl font-bold text-white">{sessionTitle || "Live Session"}</h1>
          <p className="text-sm text-slate-400">Rate this session — takes 30 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-8">
            {DIMENSIONS.map((dim) => {
              const score = scores[dim];
              const band = getBand(score);
              const { label, color } = BAND_LABELS[band];
              const narrative = getNarrative(dim, score);

              return (
                <div key={dim}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-white">{LABELS[dim]}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                      <span className="text-lg font-bold text-white w-10 text-right">{score}</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [dim]: Number(e.target.value) }))
                    }
                    className="w-full accent-violet-500 mb-3"
                  />

                  <p className="text-sm text-slate-400 italic leading-relaxed">
                    &ldquo;{narrative}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-violet-500 px-4 py-4 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}
