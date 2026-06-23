"use client";

import { useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const MOCK_RADAR = [
  { dimension: "Clarity", audience: 72 },
  { dimension: "Engagement", audience: 58 },
  { dimension: "Energy", audience: 81 },
  { dimension: "Understanding", audience: 65 },
  { dimension: "Connection", audience: 54 },
];

const DIMENSIONS = [
  {
    name: "Clarity",
    color: "text-violet-400",
    desc: "How clearly your message and structure came across to the room.",
  },
  {
    name: "Engagement",
    color: "text-blue-400",
    desc: "How well you held attention and kept the audience invested.",
  },
  {
    name: "Energy",
    color: "text-cyan-400",
    desc: "The presence, vocal delivery and energy you brought.",
  },
  {
    name: "Understanding",
    color: "text-green-400",
    desc: "How well the audience grasped the core ideas you shared.",
  },
  {
    name: "Connection",
    color: "text-pink-400",
    desc: "How personally connected the audience felt to you and the content.",
  },
];

interface Props {
  onClose: () => void;
  onCreateSession: () => void;
}

export default function OnboardingModal({ onClose, onCreateSession }: Props) {
  const [step, setStep] = useState(0);

  function dismiss() {
    localStorage.setItem("learnfast_onboarding_seen", "1");
    onClose();
  }

  function handleCreate() {
    localStorage.setItem("learnfast_onboarding_seen", "1");
    onCreateSession();
  }

  const steps = [
    // Step 0 — What is LearnFast
    <div key="step0" className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Welcome to LearnFast</p>
      <h2 className="text-2xl font-bold text-white mb-3">Real feedback.<br />Real improvement.</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
        Create a session, share the code or QR with your audience, and get honest scores across 5 dimensions — in real time.
      </p>
      <div className="w-full rounded-2xl border border-white/10 bg-[#0f1424] p-4 mb-2">
        <p className="text-xs text-slate-500 mb-2">Example session result</p>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={MOCK_RADAR}>
            <PolarGrid stroke="#ffffff15" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Radar
              name="Audience"
              dataKey="audience"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>,

    // Step 1 — The 5 dimensions
    <div key="step1">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 text-center">The 5 dimensions</p>
      <h2 className="text-xl font-bold text-white mb-1 text-center">What your audience rates</h2>
      <p className="text-sm text-slate-400 mb-5 text-center">Every session is scored across these five areas.</p>
      <div className="space-y-3">
        {DIMENSIONS.map((d) => (
          <div key={d.name} className="rounded-xl border border-white/5 bg-[#0f1424] px-4 py-3">
            <span className={`text-sm font-bold ${d.color}`}>{d.name}</span>
            <p className="text-sm text-slate-400 leading-relaxed mt-0.5">{d.desc}</p>
          </div>
        ))}
      </div>
    </div>,

    // Step 2 — Get started
    <div key="step2" className="flex flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/30">
        <span className="text-3xl">🎤</span>
      </div>
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">You&apos;re ready</p>
      <h2 className="text-2xl font-bold text-white mb-3">Create your first session</h2>
      <p className="text-sm text-slate-400 mb-2 max-w-xs leading-relaxed">
        Give your session a name, share the code with your audience before you start, and let the feedback roll in.
      </p>
      <p className="text-xs text-slate-500 mb-8 max-w-xs">
        Tip: you need at least 3–5 responses for reliable results. The more, the better.
      </p>
      <button
        onClick={handleCreate}
        className="w-full rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-400 transition"
      >
        Create my first session →
      </button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 relative">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Step indicators */}
        <div className="flex gap-1.5 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "w-6 bg-violet-500" : "w-3 bg-white/15"
              }`}
            />
          ))}
        </div>

        {steps[step]}

        {/* Nav */}
        <div className="flex justify-between items-center mt-6">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              ← Back
            </button>
          ) : (
            <button onClick={dismiss} className="text-sm text-slate-500 hover:text-slate-300 transition">
              Skip
            </button>
          )}
          {step < steps.length - 1 && (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-violet-500 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
