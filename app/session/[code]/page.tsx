"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const LABELS: Record<Dimension, string> = {
  clarity: "Presenter's Clarity",
  engagement: "Presenter's Audience Engagement",
  energy: "Presenter's Energy",
  understanding: "Presenter's Understanding",
  connection: "Presenter's Audience Connection",
};

const NARRATIVES: Record<Dimension, { max: number; text: string }[]> = {
  clarity: [
    { max: 40, text: "The message was pretty unclear, difficult to follow, or confusing." },
    { max: 60, text: "Some points were clear, but there were inconsistencies or gaps in understanding." },
    { max: 80, text: "The message was clear and well-organised, with only minor areas for improvement." },
    { max: 100, text: "Information was communicated exceptionally well, with complete clarity and strong engagement." },
  ],
  understanding: [
    { max: 40, text: "Limited understanding, with confusing explanations." },
    { max: 60, text: "Ok basic understanding, but some points I'm still not sure about." },
    { max: 80, text: "Solid understanding, with clear and accurate explanations throughout." },
    { max: 100, text: "Deep and comprehensive understanding, with thorough and insightful explanations." },
  ],
  energy: [
    { max: 40, text: "To be honest, lacked energy, appeared disengaged and failed to capture attention." },
    { max: 60, text: "Ok but I needed more to seek the ideas to me." },
    { max: 80, text: "Engaging and energetic, maintaining interest most of the time." },
    { max: 100, text: "Loved it, had me bought in and energised!" },
  ],
  connection: [
    { max: 40, text: "Just didn't feel connected to what was being said and didn't feel any effort was made to change that." },
    { max: 60, text: "Some attempts to connect, but limited or inconsistent engagement." },
    { max: 80, text: "Established a solid connection, engaging the audience effectively most of the time." },
    { max: 100, text: "Exceptional connection, I was right there with the presenter." },
  ],
  engagement: [
    { max: 40, text: "Honestly I felt pretty disengaged, there was little interaction or stimulation." },
    { max: 60, text: "Some engagement, but it felt sporadic or lacked depth." },
    { max: 80, text: "Consistently engaged the audience, with effective interaction and interest." },
    { max: 100, text: "Highly engaging, really felt part of this! Great interaction." },
  ],
};

const BAND_LABELS: Record<string, { label: string; color: string }> = {
  poor:      { label: "Poor",      color: "text-red-500" },
  okay:      { label: "Okay",      color: "text-amber-600" },
  good:      { label: "Good",      color: "text-blue-400" },
  excellent: { label: "Excellent", color: "text-green-600" },
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
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Session not found</h1>
          <p className="text-slate-400">Check the code and try again.</p>
          <a href="/join" className="mt-6 inline-block text-violet-600 underline">Enter a different code</a>
        </div>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading session…</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Thanks!</h1>
          <p className="text-slate-400">Your feedback has been recorded. It helps the presenter improve.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-xl overflow-hidden bg-white px-3 py-2 mx-auto">
            <img src="/logo.png" alt="LearnFast" className="h-8 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-white">{sessionTitle || "Live Session"}</h1>
          <p className="text-sm text-slate-400">Rate this session — takes 30 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-8">
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
                    className="slider-gradient mb-3"
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
