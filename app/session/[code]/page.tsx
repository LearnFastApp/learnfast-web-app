"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

// ── English strings ──────────────────────────────────────────────────────────

const LABELS_EN: Record<Dimension, string> = {
  clarity: "Presenter's Clarity",
  engagement: "Presenter's Audience Engagement",
  energy: "Presenter's Energy",
  understanding: "Presenter's Understanding",
  connection: "Presenter's Audience Connection",
};

const NARRATIVES_EN: Record<Dimension, { max: number; text: string }[]> = {
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
    { max: 60, text: "Ok but I needed more to sell the ideas to me." },
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

const BAND_LABELS_EN: Record<string, { label: string; color: string }> = {
  poor:      { label: "Poor",      color: "text-red-400" },
  okay:      { label: "Okay",      color: "text-amber-400" },
  good:      { label: "Good",      color: "text-blue-400" },
  excellent: { label: "Excellent", color: "text-green-400" },
};

// ── French strings ───────────────────────────────────────────────────────────

const LABELS_FR: Record<Dimension, string> = {
  clarity: "Clarté du présentateur",
  engagement: "Engagement de l'audience",
  energy: "Énergie du présentateur",
  understanding: "Compréhension du présentateur",
  connection: "Connexion avec l'audience",
};

const NARRATIVES_FR: Record<Dimension, { max: number; text: string }[]> = {
  clarity: [
    { max: 40, text: "Le message était assez peu clair, difficile à suivre ou confus." },
    { max: 60, text: "Certains points étaient clairs, mais il y avait des incohérences ou des lacunes." },
    { max: 80, text: "Le message était clair et bien structuré, avec seulement quelques améliorations possibles." },
    { max: 100, text: "L'information a été communiquée de façon exceptionnelle, avec une clarté totale." },
  ],
  understanding: [
    { max: 40, text: "Compréhension limitée, avec des explications confuses." },
    { max: 60, text: "Compréhension basique, mais certains points restent flous." },
    { max: 80, text: "Bonne compréhension, avec des explications claires et précises tout au long." },
    { max: 100, text: "Compréhension approfondie et complète, avec des explications perspicaces." },
  ],
  energy: [
    { max: 40, text: "Franchement, manquait d'énergie, semblait désengagé et n'a pas réussi à capter l'attention." },
    { max: 60, text: "Correct, mais j'aurais eu besoin de plus pour me convaincre." },
    { max: 80, text: "Engageant et énergique, maintenant l'intérêt la plupart du temps." },
    { max: 100, text: "Excellent ! J'étais totalement captivé et enthousiaste !" },
  ],
  connection: [
    { max: 40, text: "Je ne me suis pas du tout senti connecté à ce qui était dit, sans que rien ne soit fait pour y remédier." },
    { max: 60, text: "Quelques tentatives de connexion, mais limitées ou irrégulières." },
    { max: 80, text: "Bonne connexion établie, avec un engagement efficace du public la plupart du temps." },
    { max: 100, text: "Connexion exceptionnelle, j'étais totalement avec le présentateur." },
  ],
  engagement: [
    { max: 40, text: "Honnêtement, je me suis senti assez désengagé, il y avait peu d'interaction ou de stimulation." },
    { max: 60, text: "Un peu d'engagement, mais sporadique ou sans grande profondeur." },
    { max: 80, text: "Le public était régulièrement engagé, avec une interaction et un intérêt efficaces." },
    { max: 100, text: "Très engageant, je me suis vraiment senti impliqué ! Super interaction." },
  ],
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

function getNarrative(dim: Dimension, score: number, narratives: typeof NARRATIVES_EN): string {
  const bands = narratives[dim];
  return bands.find((b: { max: number; text: string }) => score <= b.max)?.text ?? bands[bands.length - 1].text;
}

function useFrench() {
  const [isFr, setIsFr] = useState(false);
  useEffect(() => {
    setIsFr(navigator.language?.toLowerCase().startsWith("fr"));
  }, []);
  return isFr;
}

export default function FeedbackPage() {
  const { code } = useParams<{ code: string }>();
  const isFr = useFrench();
  const LABELS = isFr ? LABELS_FR : LABELS_EN;
  const NARRATIVES = isFr ? NARRATIVES_FR : NARRATIVES_EN;
  const BAND_LABELS = isFr ? BAND_LABELS_FR : BAND_LABELS_EN;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [leadPresenterId, setLeadPresenterId] = useState<string | null>(null);
  const [copresenters, setCopresenters] = useState<Array<{ uid: string; displayName: string }>>([]);
  const [selectedPresenterId, setSelectedPresenterId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<Dimension, number>>({
    clarity: 50,
    engagement: 50,
    energy: 50,
    understanding: 50,
    connection: 50,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const q = query(collection(db, "sessions"), where("code", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) { setNotFound(true); return; }
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      if (data.status === "closed") { setSessionEnded(true); return; }
      setSessionId(docSnap.id);
      setSessionTitle(data.title ?? "");
      setLeadPresenterId(data.presenterId ?? null);
      const coPs: Array<{ uid: string; displayName: string }> = data.copresenters ?? [];
      setCopresenters(coPs);
      setSelectedPresenterId(data.presenterId ?? null);
    }
    loadSession();
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setSubmitting(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        scores,
        selectedPresenterId: selectedPresenterId ?? leadPresenterId,
        ...(comment.trim() && { comment: comment.trim(), anonymous, commenterName }),
      }),
    });
    if (res.ok) setSubmitted(true);
    setSubmitting(false);
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">{isFr ? "Session introuvable" : "Session not found"}</h1>
          <p className="text-slate-400">{isFr ? "Vérifiez le code et réessayez." : "Check the code and try again."}</p>
          <a href="/join" className="mt-6 inline-block text-violet-400 underline">{isFr ? "Saisir un autre code" : "Enter a different code"}</a>
        </div>
      </main>
    );
  }

  if (sessionEnded) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🎤</p>
          <h1 className="text-xl font-bold text-white mb-2">{isFr ? "Cette session est terminée" : "This session has ended"}</h1>
          <p className="text-slate-400 mb-6">{isFr ? "Le présentateur a clôturé les retours pour cette session. Merci d'avoir participé !" : "The presenter has closed feedback for this session. Thanks for attending!"}</p>
          <a
            href="/try?ref=feedback"
            className="inline-block rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition"
          >
            {isFr ? "Essayer LearnFast vous-même →" : "Try LearnFast yourself →"}
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
          <h1 className="mb-2 text-2xl font-bold text-white">{isFr ? "Merci pour vos retours !" : "Thanks for your feedback!"}</h1>
          <p className="text-slate-400 mb-8">
            {isFr
              ? "Vos scores ont été enregistrés et aideront le présentateur à comprendre exactement où progresser."
              : "Your scores have been recorded and will help the presenter understand exactly where to improve."}
          </p>

          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
            <p className="text-sm font-semibold text-white mb-1">{isFr ? "Vous présentez aussi ?" : "Do you present too?"}</p>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              {isFr
                ? "LearnFast aide les présentateurs à recueillir des retours d'audience en temps réel et à accéder à des ressources pédagogiques ciblées — pour progresser à chaque session."
                : "LearnFast helps presenters collect real-time audience feedback and get matched learning resources — so every session makes you better."}
            </p>
            <a
              href="/try?ref=feedback"
              className="inline-block rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              {isFr ? "Essayer gratuitement →" : "Try it for free →"}
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <img src="/logo.png" alt="LearnFast" className="h-8 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-white">{sessionTitle || (isFr ? "Session en direct" : "Live Session")}</h1>
          <p className="text-sm text-slate-400">{isFr ? "Évaluez cette session — 30 secondes suffisent." : "Rate this session — takes 30 seconds."}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {copresenters.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <label className="block text-sm font-semibold text-white mb-3">
                {isFr ? "Qui évaluez-vous ?" : "Who are you rating?"}
              </label>
              <select
                value={selectedPresenterId ?? ""}
                onChange={(e) => setSelectedPresenterId(e.target.value || null)}
                className="w-full bg-[#1a2135] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
              >
                {[{ uid: leadPresenterId ?? "", displayName: isFr ? "Présentateur principal" : "Lead presenter" }, ...copresenters].map((p) => (
                  <option key={p.uid} value={p.uid}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-8">
            {DIMENSIONS.map((dim) => {
              const score = scores[dim];
              const band = getBand(score);
              const { label, color } = BAND_LABELS[band];
              const narrative = getNarrative(dim, score, NARRATIVES);

              return (
                <div key={dim}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-white">{LABELS[dim]}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                      <span className="text-lg font-bold text-white w-10 text-right">{score}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 italic leading-relaxed mb-3">
                    &ldquo;{narrative}&rdquo;
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [dim]: Number(e.target.value) }))
                    }
                    className="slider-gradient"
                  />
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">
                {isFr ? "Laisser un commentaire" : "Leave a comment"} <span className="text-slate-500 font-normal">{isFr ? "(facultatif)" : "(optional)"}</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">{isFr ? "Partagez ce qui vous a marqué — positif ou constructif." : "Share anything specific that stood out — positive or constructive."}</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={isFr ? "Ex. : L'histoire d'ouverture a vraiment donné le ton…" : "e.g. The opening story really set the tone well…"}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {comment.trim() && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAnonymous((a) => !a)}
                  className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-sm transition ${
                    anonymous
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-[#1a2135] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 transition ${anonymous ? "border-violet-400 bg-violet-400" : "border-slate-600"}`}>
                    {anonymous && <span className="block h-2 w-2 rounded-full bg-white" />}
                  </span>
                  {isFr
                    ? (anonymous ? "Commentaire anonyme" : "Afficher mon nom avec ce commentaire")
                    : (anonymous ? "Commenting anonymously" : "Show my name with this comment")}
                </button>

                {!anonymous && (
                  <input
                    type="text"
                    placeholder={isFr ? "Votre prénom (facultatif)" : "Your name (optional)"}
                    value={commenterName}
                    onChange={(e) => setCommenterName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500"
                  />
                )}
              </div>
            )}
          </div>

          {copresenters.length > 0 && !selectedPresenterId && (
            <p className="text-center text-sm text-amber-400">
              {isFr ? "Veuillez sélectionner un présentateur à évaluer." : "Please select a presenter to rate."}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || (copresenters.length > 0 && !selectedPresenterId)}
            className="w-full rounded-xl bg-violet-500 px-4 py-4 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
          >
            {submitting ? (isFr ? "Envoi en cours…" : "Submitting…") : (isFr ? "Envoyer mes retours" : "Submit feedback")}
          </button>
        </form>
      </div>
    </main>
  );
}
