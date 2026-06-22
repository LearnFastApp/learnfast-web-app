"use client";

import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { X } from "lucide-react";
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

interface Props {
  sessionId: string;
  presenterId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function PresenterReflectionModal({ sessionId, presenterId, onClose, onSubmitted }: Props) {
  const [scores, setScores] = useState<Record<Dimension, number>>({
    clarity: 50,
    engagement: 50,
    energy: 50,
    understanding: 50,
    connection: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await setDoc(doc(db, "presenter_reflections", sessionId), {
      sessionId,
      presenterId,
      ...scores,
      submittedAt: serverTimestamp(),
    });
    setSubmitting(false);
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-400/20 bg-white p-8 shadow-2xl my-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Your self-reflection</h2>
            <p className="text-sm text-slate-400">How do you feel the session went?</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400 inline-block" />
          <span className="text-xs text-slate-400">Your scores will appear in cyan on the radar chart</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-cyan-500 px-4 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save reflection"}
          </button>
        </form>
      </div>
    </div>
  );
}
