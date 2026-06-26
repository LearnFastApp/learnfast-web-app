"use client";

import { useState } from "react";
import { X, Zap, Check, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Props {
  onClose: () => void;
  onPilotActivated?: () => void;
  locale?: "en" | "fr";
}

export default function UpgradeModal({ onClose, onPilotActivated, locale = "en" }: Props) {
  const { user } = useAuth();
  const isFr = locale === "fr";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPilotEntry, setShowPilotEntry] = useState(false);
  const [pilotCode, setPilotCode] = useState("");
  const [pilotLoading, setPilotLoading] = useState(false);
  const [pilotSuccess, setPilotSuccess] = useState<{ orgName: string; expiresAt: string } | null>(null);

  async function handleUpgrade() {
    if (!user) return;
    setLoading(true);
    setError("");
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid: user.uid, email: user.email }),
    });
    const data = await res.json();
    if (data.error || !data.url) {
      setError(isFr ? "Une erreur s'est produite. Veuillez réessayer." : "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  async function handlePilotRedeem() {
    if (!user || !pilotCode.trim()) return;
    setPilotLoading(true);
    setError("");
    const token = await user.getIdToken();
    const res = await fetch("/api/pilot/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: pilotCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? (isFr ? "Code invalide. Veuillez réessayer." : "Invalid code. Please try again."));
      setPilotLoading(false);
      return;
    }
    setPilotSuccess({ orgName: data.orgName, expiresAt: data.expiresAt });
    setPilotLoading(false);
    setTimeout(() => {
      onPilotActivated?.();
      onClose();
      window.location.reload();
    }, 2500);
  }

  if (pilotSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-green-500/30 bg-[#111827] p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isFr ? "Accès pilote activé !" : "Pilot access activated!"}
          </h2>
          <p className="text-sm text-slate-300 mb-1">
            {isFr ? "Bienvenue dans le pilote " : "Welcome to the "}
            <strong className="text-white">{pilotSuccess.orgName}</strong>
            {isFr ? "." : " pilot."}
          </p>
          <p className="text-sm text-slate-400">
            {isFr ? "Vous avez un accès complet jusqu'au " : "You have full access until "}
            {new Date(pilotSuccess.expiresAt).toLocaleDateString(isFr ? "fr-FR" : "en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}.
          </p>
        </div>
      </div>
    );
  }

  const features = isFr
    ? [
        "Sessions et connexions de feedback illimitées",
        "Analytiques complètes et suivi des tendances",
        "Ressources adaptées après chaque session",
        "Suivi de la pratique réflexive",
      ]
    : [
        "Unlimited sessions & feedback connections",
        "Full analytics & trend tracking",
        "Session-matched resources after every session",
        "Reflective practice tracker",
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2.5">
              <Zap className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isFr ? "Sessions gratuites utilisées" : "Free sessions used"}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {isFr ? "Passez à la version supérieure pour continuer" : "Upgrade to keep going"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {isFr
            ? <>Vous avez utilisé vos <strong className="text-white">2 sessions gratuites</strong>. Passez à Lite pour des sessions illimitées, des analyses de tendances et des ressources pédagogiques adaptées à vos sessions.</>
            : <>You&apos;ve used your <strong className="text-white">2 free sessions</strong>. Upgrade to Lite for unlimited sessions, trend analytics, and session-matched learning resources.</>}
        </p>

        <div className="rounded-xl border border-violet-500/20 bg-[#1a2135] p-4 mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-white">Lite</span>
            <span className="text-2xl font-bold text-white">
              £3.99<span className="text-sm font-normal text-slate-400">/month</span>
            </span>
          </div>
          <p className="text-xs text-violet-400 mb-3">
            {isFr ? "7 jours gratuits — aucun débit jusqu'à la fin de l'essai" : "7 days free — no charge until your trial ends"}
          </p>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition mb-3"
        >
          {loading
            ? (isFr ? "Redirection vers le paiement…" : "Redirecting to checkout…")
            : (isFr ? "Commencer l'essai gratuit de 7 jours" : "Start 7-day free trial")}
        </button>

        {!showPilotEntry ? (
          <button
            onClick={() => setShowPilotEntry(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition py-1"
          >
            <Tag className="h-3.5 w-3.5" />
            {isFr ? "Vous avez un code pilote ?" : "Have a pilot code?"}
          </button>
        ) : (
          <div className="mt-1 rounded-xl border border-white/10 bg-[#0d1120] p-4">
            <p className="text-xs text-slate-400 mb-3">
              {isFr
                ? "Saisissez le code pilote de votre organisation pour 1 mois d'accès gratuit."
                : "Enter your organisation’s pilot code for 1 month of free access."}
            </p>
            <div className="flex gap-2">
              <input
                value={pilotCode}
                onChange={(e) => setPilotCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handlePilotRedeem()}
                placeholder="e.g. TOASTMASTERS2026"
                className="flex-1 rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none"
              />
              <button
                onClick={handlePilotRedeem}
                disabled={pilotLoading || !pilotCode.trim()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
              >
                {pilotLoading ? "…" : (isFr ? "Appliquer" : "Apply")}
              </button>
            </div>
          </div>
        )}

        {!showPilotEntry && (
          <button
            onClick={onClose}
            className="w-full text-sm text-slate-600 hover:text-slate-400 transition mt-1"
          >
            {isFr ? "Plus tard" : "Maybe later"}
          </button>
        )}
      </div>
    </div>
  );
}
