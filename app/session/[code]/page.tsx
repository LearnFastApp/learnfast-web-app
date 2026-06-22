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

function randomAnonId() {
  return Math.random().toString(36).substring(2, 14);
}

export default function FeedbackPage() {
  const { code } = useParams<{ code: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [scores, setScores] = useState<Record<Dimension, number>>({
    clarity: 5,
    engagement: 5,
    energy: 5,
    understanding: 5,
    connection: 5,
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
      if (snap.empty) {
        setNotFound(true);
        return;
      }
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
          <a href="/join" className="mt-6 inline-block text-violet-400 underline">
            Enter a different code
          </a>
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
          <p className="text-slate-400">
            Your feedback has been recorded. It helps the presenter improve.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 font-bold mx-auto">
            LF
          </div>
          <h1 className="text-xl font-bold text-white">{sessionTitle || "Live Session"}</h1>
          <p className="text-sm text-slate-400">Rate this session — takes 30 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-6">
            {DIMENSIONS.map((dim) => (
              <div key={dim}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    {LABELS[dim]}
                  </label>
                  <span className="text-sm font-bold text-violet-300">
                    {scores[dim]}/10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={scores[dim]}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [dim]: Number(e.target.value) }))
                  }
                  className="w-full accent-violet-500"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
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
