import Link from "next/link";
import { Check, X, Phone, ArrowRight } from "lucide-react";

const DIMENSIONS = [
  {
    name: "Clarity",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    desc: "How clearly your message and structure comes across to the room.",
  },
  {
    name: "Energy",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    desc: "The presence, vocal delivery and energy you bring to the room.",
  },
  {
    name: "Engagement",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    desc: "How well you hold attention and keep the audience invested.",
  },
  {
    name: "Understanding",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    desc: "How well the audience grasps the core ideas you share.",
  },
  {
    name: "Connection",
    color: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    desc: "How personally connected the audience feels to you and your content.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Transparent pricing",
    learnfast: { type: "check" as const, label: "From £15/seat/mo" },
    competitor: { type: "call" as const, label: "Call sales" },
  },
  {
    feature: "Buy with a credit card",
    learnfast: { type: "check" as const, label: "Self-serve in < 5 min" },
    competitor: { type: "cross" as const, label: "Annual contracts" },
  },
  {
    feature: "Real meeting feedback loop",
    learnfast: { type: "check" as const, label: "QR → live scores" },
    competitor: { type: "cross" as const, label: "Practice sandbox only" },
  },
  {
    feature: "AI + Audience + Self-reflection",
    learnfast: { type: "check" as const, label: "Three Signal Model" },
    competitor: { type: "cross" as const, label: "Delivery only" },
  },
  {
    feature: "Manager dashboard",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "check" as const, label: "" },
  },
  {
    feature: "Rehearsal & coaching",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "check" as const, label: "" },
  },
  {
    feature: "5-seat minimum",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "cross" as const, label: "Larger minimums" },
  },
  {
    feature: "No sales call needed",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "cross" as const, label: "" },
  },
];

function CellIcon({ type, label }: { type: "check" | "cross" | "call"; label: string }) {
  if (type === "check") {
    return (
      <div className="flex items-center gap-1.5">
        <Check className="h-4 w-4 shrink-0 text-green-400" />
        {label && <span className="text-sm text-slate-300">{label}</span>}
      </div>
    );
  }
  if (type === "cross") {
    return (
      <div className="flex items-center gap-1.5">
        <X className="h-4 w-4 shrink-0 text-red-400" />
        {label && <span className="text-sm text-slate-400">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Phone className="h-4 w-4 shrink-0 text-amber-400" />
      {label && <span className="text-sm text-amber-400">{label}</span>}
    </div>
  );
}

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      {/* 0. Draft notice banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-center">
        <p className="text-xs text-amber-400 font-semibold">
          DRAFT — Copy under review. Do not share this URL publicly yet. Remove this banner once approved.
        </p>
      </div>

      {/* 1. Nav bar */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#05070d]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <img src="/logo.png" className="h-7 w-auto" alt="LearnFast" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/org/create"
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-violet-400">
          Enterprise
        </span>
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Your whole team.{" "}
          <span className="text-violet-400">Measurably better</span> presenters.
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
          LearnFast Enterprise wraps a manager dashboard and team analytics around the same AI coaching, live audience feedback, and rehearsal engine your best presenters already use — so every session makes the whole team better.
        </p>

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/create"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-400"
          >
            Start a free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a] px-8 py-3.5 font-semibold text-slate-300 transition hover:border-violet-500/50 hover:text-white"
          >
            See pricing ↓
          </Link>
        </div>

        {/* Trust metrics */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["No sales call required", "5-seat minimum", "Cancel any time"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-1.5 text-sm text-slate-400"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* 3. How it works */}
      <section className="border-y border-[#1e293b] bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <p className="mb-14 text-center text-slate-400">Up and running in under five minutes.</p>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Set up your org",
                time: "30 seconds",
                body: "Create your organisation, invite your team with one link. They join with their existing LearnFast account or create one in seconds.",
              },
              {
                step: "02",
                title: "Schedule & collect feedback",
                time: "Every session",
                body: "Every session gets a QR code. Audience scans → rates in 30 seconds → no account, no download. Scores feed straight into each presenter's five-dimension profile.",
              },
              {
                step: "03",
                title: "Coach with data",
                time: "Ongoing",
                body: "Your manager dashboard shows individual trends and org-wide radar charts. Assign rehearsal tasks. Watch scores move.",
              },
            ].map(({ step, title, time, body }) => (
              <div
                key={step}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-7"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl font-black text-violet-500/40">{step}</span>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                    {time}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Pricing & comparison */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            Self-serve. No contracts. No calls.
          </h2>
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-8 py-5 text-center">
              <p className="text-3xl font-black text-white">£15</p>
              <p className="mt-1 text-sm text-slate-400">/ seat / month</p>
              <p className="mt-2 text-xs font-semibold text-violet-400">5-seat minimum</p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] px-8 py-5 text-center">
              <p className="text-3xl font-black text-white">£12</p>
              <p className="mt-1 text-sm text-slate-400">/ seat / month, billed annually</p>
              <p className="mt-2 text-xs font-semibold text-green-400">Save 20%</p>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0f172a]">
          {/* Table header */}
          <div className="grid grid-cols-3 border-b border-[#1e293b] bg-[#0a0f1a] px-6 py-4">
            <p className="text-sm font-semibold text-slate-400">Feature</p>
            <p className="text-sm font-semibold text-violet-400">LearnFast Enterprise</p>
            <p className="text-sm font-semibold text-slate-400">Yoodli / Orai</p>
          </div>

          <div className="divide-y divide-[#1e293b]">
            {COMPARISON_ROWS.map((row) => (
              <div key={row.feature} className="grid grid-cols-3 items-center gap-4 px-6 py-4">
                <p className="text-sm text-slate-300">{row.feature}</p>
                <CellIcon type={row.learnfast.type} label={row.learnfast.label} />
                <CellIcon type={row.competitor.type} label={row.competitor.label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Five dimensions */}
      <section className="border-y border-[#1e293b] bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">
            Built on a proven five-dimension framework
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-400">
            Every session score, AI assessment, and coaching recommendation maps to the same five dimensions — so progress is measurable across the whole team.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DIMENSIONS.map(({ name, color, desc }) => (
              <div
                key={name}
                className={`rounded-2xl border p-5 ${color.includes("purple") ? "border-purple-500/30 bg-purple-500/10" : color.includes("amber") ? "border-amber-500/30 bg-amber-500/10" : color.includes("cyan") ? "border-cyan-500/30 bg-cyan-500/10" : color.includes("emerald") ? "border-emerald-500/30 bg-emerald-500/10" : "border-pink-500/30 bg-pink-500/10"}`}
              >
                <span
                  className={`mb-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${color}`}
                >
                  {name}
                </span>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA section */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
          Ready to build a team of better presenters?
        </h2>
        <p className="mb-10 text-lg text-slate-400">
          Start a 14-day free trial — no card required.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/create"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-400"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:info@learnfastapp.com"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a] px-8 py-3.5 font-semibold text-slate-300 transition hover:border-violet-500/50 hover:text-white"
          >
            Book a call instead →
          </a>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-[#1e293b] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>© 2026 LearnFast</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-slate-300">
              Terms
            </Link>
            <a
              href="mailto:info@learnfastapp.com"
              className="transition hover:text-slate-300"
            >
              info@learnfastapp.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
