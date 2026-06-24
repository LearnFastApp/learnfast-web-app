"use client";

import { useState } from "react";
import { X, Zap, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Props {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpgrade() {
    if (!user) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid, email: user.email }),
    });
    const data = await res.json();
    if (data.error || !data.url) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2.5">
              <Zap className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Free sessions used</h2>
              <p className="text-sm text-slate-400 mt-0.5">Upgrade to keep going</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          You&apos;ve used your <strong className="text-white">2 free sessions</strong>. Upgrade to Lite for unlimited sessions, trend analytics, and session-matched learning resources.
        </p>

        <div className="rounded-xl border border-violet-500/20 bg-[#1a2135] p-4 mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-white">Lite</span>
            <span className="text-2xl font-bold text-white">
              £3.99<span className="text-sm font-normal text-slate-400">/month</span>
            </span>
          </div>
          <p className="text-xs text-violet-400 mb-3">7 days free — no charge until your trial ends</p>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {[
              "Unlimited sessions & feedback connections",
              "Full analytics & trend tracking",
              "Session-matched resources after every session",
              "Reflective practice tracker",
            ].map((f) => (
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
          {loading ? "Redirecting to checkout…" : "Start 7-day free trial"}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
