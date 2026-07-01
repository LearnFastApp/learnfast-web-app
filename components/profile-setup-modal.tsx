"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { DIMS, DIM_COLOURS, DIM_LABELS, DIM_DESC, type Dim } from "@/lib/rank";
import { INDUSTRIES } from "@/lib/industries";
import { X } from "lucide-react";

interface Props {
  onClose: (saved: boolean) => void;
  locale?: "en" | "fr";
  initialValues?: {
    displayName?: string | null;
    jobTitle?: string | null;
    industry?: string | null;
    location?: string | null;
    focusDimension?: string | null;
  };
}

export default function ProfileSetupModal({ onClose, locale = "en", initialValues }: Props) {
  const { user } = useAuth();
  const isFr = locale === "fr";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(initialValues?.displayName || user?.displayName || "");
  const [jobTitle, setJobTitle] = useState(initialValues?.jobTitle || "");
  const [industry, setIndustry] = useState(initialValues?.industry || "");
  const [location, setLocation] = useState(initialValues?.location || "");
  const [focusDimension, setFocusDimension] = useState<Dim | "">(
    (initialValues?.focusDimension as Dim) || ""
  );

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, jobTitle, industry, location, focusDimension }),
      });
      onClose(true);
    } catch {
      setSaving(false);
    }
  }

  const step1Valid = displayName.trim().length > 0 && industry !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-xl"
        style={{ backgroundColor: "#0d1117" }}
      >
        {/* Top accent bar — shifts colour with selected focus dimension */}
        <div
          className="h-[3px] w-full transition-colors duration-500"
          style={{
            backgroundColor: focusDimension
              ? DIM_COLOURS[focusDimension]
              : "#8b5cf6",
          }}
        />

        <div className="px-6 pt-5 pb-6">
          {/* Header row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-0.5">
                {step === 0
                  ? (isFr ? "Étape 1 / 2" : "Step 1 / 2")
                  : (isFr ? "Étape 2 / 2" : "Step 2 / 2")}
              </p>
              <h2 className="text-xl font-bold text-white">
                {step === 0
                  ? (isFr ? "Votre identité" : "Your identity")
                  : (isFr ? "Votre focus" : "Your focus")}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {step === 0
                  ? (isFr ? "Ces informations apparaissent sur votre carte de profil." : "This appears on your presenter profile card.")
                  : (isFr ? "Sur quelle dimension travaillez-vous le plus en ce moment ?" : "Which dimension are you most focused on improving right now?")}
              </p>
            </div>
            <button
              onClick={() => onClose(false)}
              className="text-slate-600 hover:text-slate-300 transition mt-0.5 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Step 1: Identity ───────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  {isFr ? "Nom complet" : "Full name"} <span className="text-slate-700">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isFr ? "Votre nom" : "Your name"}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  {isFr ? "Titre / rôle" : "Job title / role"}
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={isFr ? "ex. Directeur commercial" : "e.g. Head of Sales"}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  {isFr ? "Secteur" : "Industry"} <span className="text-slate-700">*</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition appearance-none cursor-pointer"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <option value="" disabled style={{ background: "#0d1117" }}>
                    {isFr ? "Sélectionnez votre secteur…" : "Select your industry…"}
                  </option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value} style={{ background: "#0d1117" }}>
                      {isFr ? ind.fr : ind.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">
                  {isFr ? "Ville / pays" : "City / country"}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={isFr ? "ex. Paris, France" : "e.g. London, UK"}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Focus dimension ────────────────────── */}
          {step === 1 && (
            <div className="space-y-2">
              {DIMS.map((d) => {
                const selected = focusDimension === d;
                const colour = DIM_COLOURS[d];
                return (
                  <button
                    key={d}
                    onClick={() => setFocusDimension(d)}
                    className="w-full text-left rounded-lg px-4 py-3 transition group"
                    style={{
                      backgroundColor: selected ? `${colour}12` : "rgba(255,255,255,0.03)",
                      borderLeft: `3px solid ${selected ? colour : "transparent"}`,
                      border: selected ? `1px solid ${colour}30` : "1px solid rgba(255,255,255,0.06)",
                      borderLeftWidth: "3px",
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-0.5 transition"
                      style={{ color: selected ? colour : "#94a3b8" }}
                    >
                      {DIM_LABELS[d][isFr ? "fr" : "en"]}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {DIM_DESC[d][isFr ? "fr" : "en"]}
                    </p>
                  </button>
                );
              })}
              <button
                onClick={() => setFocusDimension("")}
                className="w-full text-left rounded-lg px-4 py-3 transition"
                style={{
                  backgroundColor: focusDimension === "" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-sm text-slate-500">
                  {isFr ? "Je travaille sur tout à la fois" : "I'm working on all of them"}
                </p>
              </button>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────── */}
          <div className="flex items-center justify-between mt-6">
            {step === 0 ? (
              <button
                onClick={() => onClose(false)}
                className="text-xs text-slate-600 hover:text-slate-400 transition"
              >
                {isFr ? "Ignorer pour l'instant" : "Skip for now"}
              </button>
            ) : (
              <button
                onClick={() => setStep(0)}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                ← {isFr ? "Retour" : "Back"}
              </button>
            )}

            {step === 0 ? (
              <button
                onClick={() => setStep(1)}
                disabled={!step1Valid}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-30"
                style={{ backgroundColor: "#8b5cf6" }}
              >
                {isFr ? "Suivant →" : "Next →"}
              </button>
            ) : (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{
                  backgroundColor: focusDimension ? DIM_COLOURS[focusDimension] : "#8b5cf6",
                }}
              >
                {saving
                  ? (isFr ? "Enregistrement…" : "Saving…")
                  : (isFr ? "Enregistrer le profil" : "Save profile")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
