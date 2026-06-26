"use client";

import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { X } from "lucide-react";
import { db } from "@/lib/firebase";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const LABELS_EN: Record<Dimension, string> = {
  clarity: "Clarity",
  engagement: "Engagement",
  energy: "Energy",
  understanding: "Understanding",
  connection: "Connection",
};

const LABELS_FR: Record<Dimension, string> = {
  clarity: "Clarté",
  engagement: "Engagement",
  energy: "Énergie",
  understanding: "Compréhension",
  connection: "Connexion",
};

const NARRATIVES_EN: Record<Dimension, { max: number; text: string }[]> = {
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

const NARRATIVES_FR: Record<Dimension, { max: number; text: string }[]> = {
  clarity: [
    { max: 40, text: "J'ai eu du mal à exprimer mes idées clairement et j'ai souvent eu l'impression que mes explications pouvaient prêter à confusion." },
    { max: 60, text: "J'ai réussi à exprimer certains points clairement, mais il y a eu des moments où j'aurais pu être plus concis(e) ou précis(e)." },
    { max: 80, text: "La plupart de mes points étaient bien formulés et clairs, avec seulement quelques éléments à peaufiner." },
    { max: 100, text: "Mes idées ont été communiquées avec clarté et précision, laissant peu de place aux malentendus." },
  ],
  understanding: [
    { max: 40, text: "J'ai l'impression de ne pas avoir pleinement transmis mon message, et l'audience a probablement eu du mal à suivre mon raisonnement." },
    { max: 60, text: "J'ai fait des efforts pour expliquer mes points, mais il y avait des lacunes pour m'assurer que l'audience avait vraiment saisi mon message." },
    { max: 80, text: "J'ai rendu mes points compréhensibles et je pense que l'audience a compris la majorité de ce que je disais." },
    { max: 100, text: "Je pense que le groupe a pleinement compris mon message et mes idées tout au long de la présentation." },
  ],
  energy: [
    { max: 40, text: "Je pense que j'ai manqué d'énergie, et ma présentation manquait d'enthousiasme ou de dynamisme." },
    { max: 60, text: "Mon niveau d'énergie était modéré, mais il y avait des moments où j'aurais pu être plus engageant(e)." },
    { max: 80, text: "Je pense avoir livré ma présentation avec une bonne énergie, maintenant un ton vivant et engageant pour la majorité du temps." },
    { max: 100, text: "J'ai ressenti une énergie vibrante et constante, captivant et maintenant l'attention tout au long." },
  ],
  connection: [
    { max: 40, text: "Je pense avoir eu du mal à établir un lien significatif avec le groupe, et l'interaction semblait distante." },
    { max: 60, text: "J'ai réussi à établir un certain lien avec le groupe, mais j'aurais pu faire davantage pour créer de la complicité." },
    { max: 80, text: "Je pense m'être bien connecté(e) avec le groupe et avoir établi un bon niveau de rapport et d'interaction." },
    { max: 100, text: "J'ai eu le sentiment de créer un lien fort avec le groupe et de favoriser un sentiment de confiance et d'engagement." },
  ],
  engagement: [
    { max: 40, text: "Le groupe semblait peu engagé, et j'ai peu fait pour les impliquer activement ou les captiver." },
    { max: 60, text: "Le groupe était quelque peu engagé, bien qu'il y ait eu des opportunités de les impliquer plus activement." },
    { max: 80, text: "Le groupe semblait engagé et je pense avoir réussi à maintenir leur attention pendant la majeure partie de la présentation." },
    { max: 100, text: "Le groupe semblait très engagé, participant activement et attentif tout au long de la présentation." },
  ],
};

const BAND_LABELS_EN: Record<string, { label: string; color: string }> = {
  poor:      { label: "Poor",      color: "text-red-400" },
  okay:      { label: "Okay",      color: "text-amber-400" },
  good:      { label: "Good",      color: "text-blue-400" },
  excellent: { label: "Excellent", color: "text-green-400" },
};

const BAND_LABELS_FR: Record<string, { label: string; color: string }> = {
  poor:      { label: "Faible",    color: "text-red-400" },
  okay:      { label: "Moyen",     color: "text-amber-400" },
  good:      { label: "Bien",      color: "text-blue-400" },
  excellent: { label: "Excellent", color: "text-green-400" },
};

function getBand(score: number) {
  if (score <= 40) return "poor";
  if (score <= 60) return "okay";
  if (score <= 80) return "good";
  return "excellent";
}

interface Props {
  sessionId: string;
  presenterId: string;
  locale?: "en" | "fr";
  onClose: () => void;
  onSubmitted: () => void;
}

export default function PresenterReflectionModal({ sessionId, presenterId, locale = "en", onClose, onSubmitted }: Props) {
  const [scores, setScores] = useState<Record<Dimension, number>>({
    clarity: 50,
    engagement: 50,
    energy: 50,
    understanding: 50,
    connection: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  const isFr = locale === "fr";
  const LABELS = isFr ? LABELS_FR : LABELS_EN;
  const NARRATIVES = isFr ? NARRATIVES_FR : NARRATIVES_EN;
  const BAND_LABELS = isFr ? BAND_LABELS_FR : BAND_LABELS_EN;

  function getNarrative(dim: Dimension, score: number): string {
    const bands = NARRATIVES[dim];
    return bands.find((b) => score <= b.max)?.text ?? bands[bands.length - 1].text;
  }

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
      <div className="w-full max-w-lg rounded-2xl border border-cyan-400/20 bg-[#111827] p-8 shadow-2xl my-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{isFr ? "Votre auto-évaluation" : "Your self-reflection"}</h2>
            <p className="text-sm text-slate-400">{isFr ? "Comment s'est passée la session selon vous ?" : "How do you feel the session went?"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400 inline-block" />
          <span className="text-xs text-slate-400">
            {isFr ? "Vos scores apparaîtront en cyan sur le graphique radar" : "Your scores will appear in cyan on the radar chart"}
          </span>
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
            {submitting ? (isFr ? "Sauvegarde…" : "Saving…") : (isFr ? "Sauvegarder ma réflexion" : "Save reflection")}
          </button>
        </form>
      </div>
    </div>
  );
}
