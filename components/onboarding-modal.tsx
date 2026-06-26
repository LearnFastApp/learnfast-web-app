"use client";

import { useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  onClose: () => void;
  onCreateSession: () => void;
  locale?: "en" | "fr";
}

export default function OnboardingModal({ onClose, onCreateSession, locale = "en" }: Props) {
  const [step, setStep] = useState(0);
  const isFr = locale === "fr";

  const mockRadar = isFr
    ? [
        { dimension: "Clarté", audience: 72 },
        { dimension: "Engagement", audience: 58 },
        { dimension: "Énergie", audience: 81 },
        { dimension: "Compréhension", audience: 65 },
        { dimension: "Connexion", audience: 54 },
      ]
    : [
        { dimension: "Clarity", audience: 72 },
        { dimension: "Engagement", audience: 58 },
        { dimension: "Energy", audience: 81 },
        { dimension: "Understanding", audience: 65 },
        { dimension: "Connection", audience: 54 },
      ];

  const dimensions = isFr
    ? [
        { name: "Clarté", color: "text-violet-400", desc: "La clarté avec laquelle votre message et votre structure ont été perçus par l'audience." },
        { name: "Engagement", color: "text-blue-400", desc: "Votre capacité à capter l'attention et à maintenir l'intérêt de l'audience." },
        { name: "Énergie", color: "text-cyan-400", desc: "La présence, la voix et l'énergie que vous avez apportées." },
        { name: "Compréhension", color: "text-green-400", desc: "La façon dont l'audience a saisi les idées essentielles que vous avez partagées." },
        { name: "Connexion", color: "text-pink-400", desc: "Le lien personnel que l'audience a ressenti avec vous et le contenu." },
      ]
    : [
        { name: "Clarity", color: "text-violet-400", desc: "How clearly your message and structure came across to the room." },
        { name: "Engagement", color: "text-blue-400", desc: "How well you held attention and kept the audience invested." },
        { name: "Energy", color: "text-cyan-400", desc: "The presence, vocal delivery and energy you brought." },
        { name: "Understanding", color: "text-green-400", desc: "How well the audience grasped the core ideas you shared." },
        { name: "Connection", color: "text-pink-400", desc: "How personally connected the audience felt to you and the content." },
      ];

  const steps = [
    // Step 0
    <div key="step0" className="flex flex-col items-center text-center">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
        {isFr ? "Bienvenue sur LearnFast™" : "Welcome to LearnFast™"}
      </p>
      <h2 className="text-2xl font-bold text-white mb-3">
        {isFr ? <>Feedback réel.<br />Amélioration réelle.</> : <>Real feedback.<br />Real improvement.</>}
      </h2>
      <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
        {isFr
          ? "Créez une session, partagez le code ou le QR avec votre audience, et obtenez des scores honnêtes sur 5 dimensions — en temps réel."
          : "Create a session, share the code or QR with your audience, and get honest scores across 5 dimensions — in real time."}
      </p>
      <div className="w-full rounded-2xl border border-white/10 bg-[#0f1424] p-4 mb-2">
        <p className="text-xs text-slate-500 mb-2">
          {isFr ? "Exemple de résultat de session" : "Example session result"}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={mockRadar}>
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

    // Step 1
    <div key="step1">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 text-center">
        {isFr ? "Les 5 dimensions" : "The 5 dimensions"}
      </p>
      <h2 className="text-xl font-bold text-white mb-1 text-center">
        {isFr ? "Ce que votre audience évalue" : "What your audience rates"}
      </h2>
      <p className="text-sm text-slate-400 mb-5 text-center">
        {isFr ? "Chaque session est évaluée sur ces cinq axes." : "Every session is scored across these five areas."}
      </p>
      <div className="space-y-3">
        {dimensions.map((d) => (
          <div key={d.name} className="rounded-xl border border-white/5 bg-[#0f1424] px-4 py-3">
            <span className={`text-sm font-bold ${d.color}`}>{d.name}</span>
            <p className="text-sm text-slate-400 leading-relaxed mt-0.5">{d.desc}</p>
          </div>
        ))}
      </div>
    </div>,

    // Step 2
    <div key="step2" className="flex flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/30">
        <span className="text-3xl">🎤</span>
      </div>
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
        {isFr ? "Vous êtes prêt" : "You're ready"}
      </p>
      <h2 className="text-2xl font-bold text-white mb-3">
        {isFr ? "Créez votre première session" : "Create your first session"}
      </h2>
      <p className="text-sm text-slate-400 mb-2 max-w-xs leading-relaxed">
        {isFr
          ? "Donnez un nom à votre session, partagez le code avec votre audience avant de commencer, et laissez les retours arriver."
          : "Give your session a name, share the code with your audience before you start, and let the feedback roll in."}
      </p>
      <p className="text-xs text-slate-500 mb-8 max-w-xs">
        {isFr
          ? "Conseil : il vous faut au moins 3 à 5 réponses pour des résultats fiables. Plus il y en a, mieux c'est."
          : "Tip: you need at least 3–5 responses for reliable results. The more, the better."}
      </p>
      <button
        onClick={onCreateSession}
        className="w-full rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-400 transition"
      >
        {isFr ? "Créer ma première session →" : "Create my first session →"}
      </button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

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

        <div className="flex justify-between items-center mt-6">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              {isFr ? "← Retour" : "← Back"}
            </button>
          ) : (
            <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 transition">
              {isFr ? "Passer" : "Skip"}
            </button>
          )}
          {step < steps.length - 1 && (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-violet-500 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              {isFr ? "Suivant →" : "Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
