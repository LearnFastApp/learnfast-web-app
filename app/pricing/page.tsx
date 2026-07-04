"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const TIERS = [
  {
    name: "Free",
    price: "£0",
    period: null,
    description: "Get started risk-free",
    features: [
      "2 session feedback connections",
      "Real-time audience radar chart — all 5 dimensions",
      "Presenter self-reflection scores",
      "Gap analysis report",
      "Session notes & commitment tracking",
    ],
    cta: null,
    highlight: false,
    comingSoon: false,
  },
  {
    name: "Lite",
    price: "£3.99",
    period: "/month",
    description: "7 days free, then £3.99/month",
    features: [
      "Everything in Free, unlimited sessions",
      "3 AI assessments per month",
      "AI coaching — scores, rationale & improvement tips",
      "Vocal statistics & transcript highlights",
      "Comparative coaching that evolves with your history",
      "Post-session email summary with AI insights",
      "Performance over time — line chart + dimension trends",
      "Auto-generated insights from your session history",
      "Dimension-matched resources — videos, TED talks, podcasts & articles",
    ],
    cta: "Start 7-day free trial",
    highlight: true,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "Coming Soon",
    period: null,
    description: "For serious development",
    features: [
      "Everything in Lite",
      "Unlimited AI assessments",
      "Industry leaderboard & normative benchmarking",
      "Premium curated content library",
      "BBC Maestro, Harvard Business Review & more",
      "Personalised learning pathways",
      "Priority support",
    ],
    cta: null,
    highlight: false,
    comingSoon: true,
  },
] as const;

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    setNotifyLoading(true);
    try {
      const token = user ? await user.getIdToken() : null;
      await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: notifyEmail }),
      });
    } finally {
      setNotifyLoading(false);
      setNotifySubmitted(true);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSuccess(params.get("success") === "true");
    setCancelled(params.get("cancelled") === "true");
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login");
  }, [user, authLoading, router]);

  async function handleUpgrade() {
    if (!user) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid: user.uid, email: user.email }),
    });
    const data = await res.json();
    if (data.error || !data.url) {
      setCheckoutError("Something went wrong. Please try again.");
      setCheckoutLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Choose your plan</h1>
            <p className="text-sm text-slate-400">Unlock the full power of LearnFast</p>
          </div>
          <a href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        {success && (
          <div className="mb-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
            <p className="font-semibold text-green-300">You&apos;re now on Lite — welcome aboard!</p>
            <p className="mt-1 text-sm text-slate-400">
              All features are unlocked.{" "}
              <a href="/" className="text-violet-400 underline">
                Go to dashboard →
              </a>
            </p>
          </div>
        )}

        {cancelled && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <p className="font-semibold text-amber-300">
              No problem — you can upgrade any time.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-violet-500/50 bg-violet-500/5 shadow-lg shadow-violet-500/10"
                  : "border-white/10 bg-[#111827]"
              }`}
            >
              {tier.highlight && (
                <span className="mb-3 self-start rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                {tier.highlight && <Zap className="h-4 w-4 text-violet-400" />}
                <h2 className="text-xl font-bold">{tier.name}</h2>
              </div>
              <p className="text-sm text-slate-400 mb-4">{tier.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-slate-400">{tier.period}</span>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.comingSoon ? (
                <div className="space-y-3">
                  {notifySubmitted ? (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm text-green-300">
                      ✓ We&apos;ll notify you when Pro launches
                    </div>
                  ) : (
                    <form onSubmit={handleNotify}
                      className="flex flex-col gap-2"
                    >
                      <input
                        type="email"
                        required
                        placeholder="your@email.com"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500"
                      />
                      <button
                        type="submit"
                        disabled={notifyLoading}
                        className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition disabled:opacity-50"
                      >
                        <Bell className="h-4 w-4" />
                        {notifyLoading ? "Saving…" : "Notify me when Pro launches"}
                      </button>
                    </form>
                  )}
                </div>
              ) : tier.cta ? (
                <>
                  {checkoutError && (
                    <p className="mb-2 text-xs text-red-400">{checkoutError}</p>
                  )}
                  <button
                    onClick={handleUpgrade}
                    disabled={checkoutLoading}
                    className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
                  >
                    {checkoutLoading ? "Redirecting…" : tier.cta}
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-slate-400">
                  Current plan
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
