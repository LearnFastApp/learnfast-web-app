"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, ChevronRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";

const MIN_SEATS = 5;
const MAX_SEATS = 50;

export default function CreateOrgPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [name, setName] = useState("");
  const [seats, setSeats] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: name.trim(), seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_in_org") setError("You're already a member of an organisation.");
        else if (data.error === "invalid_seats") setError(`Seat count must be between ${data.min} and ${data.max}.`);
        else setError("Something went wrong. Please try again.");
        return;
      }
      router.replace(`/${data.orgId}/members`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const monthlyCost = seats * 15;
  const annualCost = seats * 12 * 12;

  return (
    <main className="min-h-screen bg-[#05070d]">
      <MobileNav />
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Enterprise</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create your organisation</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Start a 14-day free trial. No charge until your trial ends.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Organisation name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
              minLength={2}
              maxLength={60}
              className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Seats
              </span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_SEATS}
                max={MAX_SEATS}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <div className="w-14 text-center">
                <span className="text-2xl font-bold text-white">{seats}</span>
              </div>
            </div>
            <div className="mt-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex justify-between text-sm">
              <div>
                <p className="text-slate-400">Monthly</p>
                <p className="text-white font-semibold mt-0.5">£{monthlyCost.toLocaleString()}/mo</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Annual (save 20%)</p>
                <p className="text-white font-semibold mt-0.5">£{annualCost.toLocaleString()}/yr</p>
              </div>
            </div>
            {seats >= MAX_SEATS && (
              <p className="mt-2 text-sm text-slate-400">
                Need more than {MAX_SEATS} seats?{" "}
                <a href="mailto:hello@learnfastapp.com" className="text-violet-400 underline">
                  Contact us
                </a>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? "Creating…" : "Start 14-day trial"}
            {!submitting && <ChevronRight className="w-4 h-4" />}
          </button>

          <p className="text-center text-xs text-slate-500">
            Card required after trial. Cancel anytime.
          </p>
        </form>
      </div>
    </main>
  );
}
