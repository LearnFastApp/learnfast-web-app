"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const DIMS = [
  { key: "clarity",       label: "Clarity",       emoji: "💡", desc: "How clear and easy to follow was the presenter?" },
  { key: "energy",        label: "Energy",         emoji: "⚡", desc: "How energised and dynamic did the presenter feel?" },
  { key: "engagement",    label: "Engagement",     emoji: "🎯", desc: "How engaged and interested did you feel?" },
  { key: "understanding", label: "Understanding",  emoji: "🧠", desc: "How well did you understand the content?" },
  { key: "connection",    label: "Connection",     emoji: "🤝", desc: "How connected did you feel to the presenter?" },
] as const;

type DimKey = (typeof DIMS)[number]["key"];
type Scores = Record<DimKey, number>;

interface SessionInfo {
  sessionId: string;
  orgId: string;
  title: string;
  type: string;
  orgName: string | null;
  status: string;
  inWindow: boolean;
  feedbackAnonymousDefault: boolean;
}

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
            value === n
              ? "bg-violet-600 text-white scale-110 shadow-lg shadow-violet-500/30"
              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const params = useParams();
  const code = (params?.code as string ?? "").toUpperCase();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loadError, setLoadError] = useState<"not_found" | "outside_window" | "error" | null>(null);
  const [loading, setLoading] = useState(true);

  const [scores, setScores] = useState<Scores>({ clarity: 0, energy: 0, engagement: 0, understanding: 0, connection: 0 });
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [showName, setShowName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/f/${code}`);
        if (res.status === 404) { setLoadError("not_found"); return; }
        if (!res.ok) { setLoadError("error"); return; }
        const data: SessionInfo = await res.json();
        if (!data.inWindow) { setLoadError("outside_window"); return; }
        setSession(data);
        setShowName(!data.feedbackAnonymousDefault);
      } catch {
        setLoadError("error");
      } finally {
        setLoading(false);
      }
    }
    if (code) load();
  }, [code]);

  const allScored = DIMS.every((d) => scores[d.key] > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !allScored || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/f/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, comment: comment.trim() || null, respondentName: name.trim() || null }),
      });
      if (res.status === 410) { setLoadError("outside_window"); return; }
      if (res.status === 429) { setSubmitError("Too many submissions. Please wait a moment."); return; }
      if (!res.ok) { setSubmitError("Something went wrong. Please try again."); return; }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (loadError === "not_found") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg mb-2">Session not found</h1>
          <p className="text-slate-400 text-sm">Check the link or QR code and try again.</p>
        </div>
      </main>
    );
  }

  if (loadError === "outside_window") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg mb-2">Feedback is closed</h1>
          <p className="text-slate-400 text-sm">
            This session is no longer accepting responses. Thanks for showing up!
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm">Please try again or ask the presenter for a new link.</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-white font-bold text-xl mb-2">Thank you!</h1>
          <p className="text-slate-400 text-sm mb-8">
            Your feedback has been sent to the presenter. It helps them improve every time.
          </p>
          <a
            href="/try?ref=feedback"
            className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            See your own presenter score →
          </a>
          <p className="text-xs text-slate-600 mt-4">Powered by LearnFast</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="max-w-lg mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-8">
          {session?.orgName && (
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
              {session.orgName}
            </p>
          )}
          <h1 className="text-xl font-bold text-white leading-snug">{session?.title}</h1>
          <p className="text-sm text-slate-400 mt-1">Rate the presentation across five dimensions</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {DIMS.map((dim) => (
            <div key={dim.key}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-base">{dim.emoji}</span>
                <span className="font-semibold text-white text-sm">{dim.label}</span>
                {scores[dim.key] > 0 && (
                  <span className="ml-auto text-violet-400 font-bold text-sm">{scores[dim.key]}/10</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{dim.desc}</p>
              <ScorePicker
                value={scores[dim.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [dim.key]: v }))}
              />
            </div>
          ))}

          {/* Optional comment */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Any specific feedback? <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What stood out? What could improve?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {/* Optional name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowName((v) => !v)}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${showName ? "bg-violet-600" : "bg-white/10"}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${showName ? "translate-x-4" : ""}`} />
            </button>
            <span className="text-sm text-slate-400">Add your name</span>
          </div>
          {showName && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          )}

          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={!allScored || submitting}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-colors"
          >
            {submitting ? "Sending…" : allScored ? "Submit feedback" : `Score all 5 dimensions to continue`}
          </button>
        </form>

        <p className="text-center text-xs text-slate-700 mt-8">Powered by LearnFast</p>
      </div>
    </main>
  );
}
