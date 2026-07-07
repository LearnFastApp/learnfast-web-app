import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Check, X, Phone, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "LearnFast Enterprise — Team Communication Coaching at Scale",
  description:
    "Give every presenter in your organisation instant, anonymous audience feedback. LearnFast Enterprise tracks communication skills across your whole team — with analytics, coaching integrations, and per-seat billing.",
  openGraph: {
    title: "LearnFast Enterprise — Team Communication Coaching at Scale",
    description:
      "Real-time presentation feedback for enterprise teams. Anonymous scores, radar charts, and longitudinal skill tracking — no app download required.",
  },
};

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

const FEATURES = [
  {
    icon: "📡",
    title: "Live Audience Feedback",
    body: "Every session gets a QR code. The audience scans and rates across all five dimensions in under a minute — no app, no login, no friction. Scores appear in real time as they arrive.",
  },
  {
    icon: "📈",
    title: "Team Analytics & Trends",
    body: "A team-wide radar and performance table showing every member's session count, feedback volume and dimension averages side by side. Spot who's improving and who needs support — at a glance.",
  },
  {
    icon: "🔍",
    title: "Member Performance Drill-Down",
    body: "Click any team member to see their full session history, a performance-over-time line chart with dimension toggles, and first-to-last trend indicators. The same depth as individual analytics — for every person on your team.",
  },
  {
    icon: "🧠",
    title: "AI Rehearsal Coaching",
    body: "Every member gets AI-powered rehearsal. Record a take, receive high-standard coaching on your weakest dimensions, then go again with precise direction. Take-by-take progression, script improvement suggestions, save-your-best-take flow.",
  },
  {
    icon: "📋",
    title: "Assignment System",
    body: "Coaches and admins can assign rehearsal tasks to specific members with due dates. Track completion from the analytics dashboard — pending, overdue and completed assignments in one view.",
  },
  {
    icon: "💬",
    title: "Team Coaching Feed",
    body: "Members share rehearsals to a private team feed. Coaches leave targeted feedback by dimension. A contribution rank system keeps the team accountable and engaged.",
  },
  {
    icon: "📚",
    title: "Resource Hub",
    body: "Every member gets access to a curated library of articles, TED Talks, videos and podcasts — filtered by the dimension they're working on. Content updates automatically as their scores evolve.",
  },
  {
    icon: "🤝",
    title: "Executive Coach Roster",
    body: "Give your team access to vetted communication coaches, matched by specialism — executive presence, storytelling, pitch coaching, data communication and more. Org admins control roster access.",
  },
  {
    icon: "🎨",
    title: "Organisation Branding",
    body: "Upload your logo and the platform automatically extracts your brand colour and applies it throughout — replacing the LearnFast wordmark with yours. Your platform, your identity.",
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
    feature: "Live audience feedback loop",
    learnfast: { type: "check" as const, label: "QR → real-time scores" },
    competitor: { type: "cross" as const, label: "Practice sandbox only" },
  },
  {
    feature: "AI + Audience + Self-reflection",
    learnfast: { type: "check" as const, label: "Three Signal Model" },
    competitor: { type: "cross" as const, label: "Delivery AI only" },
  },
  {
    feature: "Individual performance tracking",
    learnfast: { type: "check" as const, label: "Drill-down + trend charts" },
    competitor: { type: "cross" as const, label: "" },
  },
  {
    feature: "Manager dashboard",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "check" as const, label: "" },
  },
  {
    feature: "Rehearsal & AI coaching",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "check" as const, label: "" },
  },
  {
    feature: "Curated learning resources",
    learnfast: { type: "check" as const, label: "Dimension-matched" },
    competitor: { type: "cross" as const, label: "" },
  },
  {
    feature: "Assignment tracking",
    learnfast: { type: "check" as const, label: "" },
    competitor: { type: "cross" as const, label: "" },
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
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#05070d]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon-mark.png" alt="LearnFast" width={32} height={23} />
            <span className="text-base font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
              LEARN<span className="font-light">FAST</span>
              <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-slate-300 transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/org/signup"
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          YOUR WHOLE TEAM.{" "}
          <span className="text-violet-400">ONE FEEDBACK PLATFORM.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
          Most L&amp;D teams have no visibility into how their people communicate. Presenters walk out of the room and get nothing actionable — no scores, no trends, no way to know if they&apos;re improving. LearnFast fixes that. Live audience feedback, AI rehearsal coaching and measurable performance tracking for every presenter on your team — in one platform you control.
        </p>

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/signup"
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

        <div className="flex flex-wrap items-center justify-center gap-3">
          {["No sales call required", "5-seat minimum", "14-day free trial", "Cancel any time"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[#1e293b] bg-[#0f172a] px-4 py-1.5 text-sm text-slate-400"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Problem band */}
      <section className="border-t border-[#1e293b]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-10">Sound familiar?</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: "Our presenters get feedback after every session — it's just 'great job' and nothing measurable.",
                fix: "LearnFast replaces vague praise with real-time scores across five structured dimensions.",
              },
              {
                quote: "We invest in coaching, but we have no way to tell if it's actually working.",
                fix: "Performance over time — line charts and trend data for every member, every session.",
              },
              {
                quote: "I can't see how my team communicates without sitting in every meeting.",
                fix: "A manager dashboard that shows individual and team-wide patterns — without you being in the room.",
              },
            ].map(({ quote, fix }) => (
              <div key={fix} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
                <p className="text-sm text-slate-400 italic leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <p className="text-xs font-semibold text-violet-400 leading-relaxed">{fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[#1e293b] bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <p className="mb-14 text-center text-slate-400">Up and running in under five minutes. No IT team required.</p>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Bring your team in",
                time: "2 minutes",
                body: "Create your organisation, upload your logo and invite your team. They join with their existing LearnFast account or sign up in seconds — no software to install, no IT ticketing.",
              },
              {
                step: "02",
                title: "Collect feedback at every session",
                time: "30 seconds per audience member",
                body: "Each session gets a QR code. The audience scans and rates in under a minute — no app, no login, no friction. Scores flow straight into each presenter's five-dimension profile.",
              },
              {
                step: "03",
                title: "Coach the whole team with data",
                time: "Ongoing",
                body: "Your dashboard shows individual trends and team-wide patterns side by side. Drill into any member's performance history, assign rehearsals, and watch scores move — session by session, person by person.",
              },
            ].map(({ step, title, time, body }) => (
              <div key={step} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-7">
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

      {/* Product stats */}
      <section className="border-b border-[#1e293b]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1e293b] text-center">
            {[
              { stat: "< 1 min", label: "for an audience member to submit feedback — no app, no login" },
              { stat: "5 dimensions", label: "every session scored across the same structured framework, every time" },
              { stat: "0 installs", label: "audience scans a QR code and rates — works on any phone" },
            ].map(({ stat, label }) => (
              <div key={stat} className="px-4 sm:px-8 py-6 sm:py-4">
                <p className="text-3xl font-black text-violet-400 mb-2">{stat}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[#1e293b] bg-[#0f172a]/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">Trusted by coaches we coach</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-slate-400">Real coaches, real results — feedback that improves your delivery.</p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex gap-4 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
              <div className="flex-shrink-0">
                <Image src="/testimonials/sydney-swans.png" alt="Sydney Swans" width={84} height={84} className="rounded-md object-contain" />
              </div>
              <div>
                <p className="text-sm text-slate-300 italic leading-relaxed mb-3">
                  “Conference presenting is a strange skill — high stakes, infrequent reps, and almost no honest feedback. LearnFast fills that gap. I rehearse the talk, get scored on how it actually comes across, and refine the delivery before I'm in front of a room full of peers. By the time I step on stage, the rough edges have already been found and fixed. Invaluable preparation tool.”
                </p>
                <p className="text-sm font-semibold text-white">Shane Lehane</p>
                <p className="text-xs text-slate-400">Head of Athletic Performance, Sydney Swans</p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
              <div className="flex-shrink-0">
                <Image src="/testimonials/ufc-pi.png" alt="UFC Performance Institute" width={84} height={84} className="rounded-md object-contain" />
              </div>
              <div>
                <p className="text-sm text-slate-300 italic leading-relaxed mb-3">
                  “As a coach, how you deliver a message is half the job. LearnFast has been invaluable for rehearsing presentations before the real thing — you present, the audience scores what they actually experienced, and you get honest, live feedback instead of a polite nod. It's changed how I prepare, and my delivery has improved because of it.”
                </p>
                <p className="text-sm font-semibold text-white">Dean Amasinger</p>
                <p className="text-xs text-slate-400">Technical Director, UFC Performance Institute</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">Everything in the platform</h2>
        <p className="mb-14 text-center text-slate-400 max-w-2xl mx-auto">
          From the moment a presenter steps up to a year of tracked development — every tool they need is already here.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
              <p className="text-3xl mb-4">{icon}</p>
              <p className="font-bold text-sm uppercase tracking-wider mb-3 text-white">{title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing & comparison */}
      <section id="pricing" className="border-t border-[#1e293b] bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
              Simple pricing. No contracts, no calls.
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
          <div className="overflow-x-auto rounded-2xl border border-[#1e293b]">
            <div className="min-w-[520px] bg-[#0f172a]">
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
          </div>
        </div>
      </section>

      {/* Five dimensions */}
      <section className="border-y border-[#1e293b]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">
            One framework. Five dimensions. Measurable progress.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-400">
            Every score, every AI assessment, and every coaching note maps to the same five dimensions — so you can see exactly where each person is growing and where the team needs work.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DIMENSIONS.map(({ name, color, desc }) => (
              <div
                key={name}
                className={`rounded-2xl border p-5 ${color.includes("purple") ? "border-purple-500/30 bg-purple-500/10" : color.includes("amber") ? "border-amber-500/30 bg-amber-500/10" : color.includes("cyan") ? "border-cyan-500/30 bg-cyan-500/10" : color.includes("emerald") ? "border-emerald-500/30 bg-emerald-500/10" : "border-pink-500/30 bg-pink-500/10"}`}
              >
                <span className={`mb-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
                  {name}
                </span>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-28 text-center">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-violet-400">
          The bottom line
        </p>
        <h2 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl">
          Your ideas are only as good<br className="hidden sm:block" /> as how they&apos;re delivered.
        </h2>
        <p className="mb-10 text-lg text-slate-400 leading-relaxed">
          LearnFast gives every presenter on your team the feedback they need to close the gap — without the overhead of coaching programmes or the guesswork of self-assessment.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/signup"
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
        <p className="mt-6 text-sm text-slate-600">14-day free trial · No card required · Cancel any time</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>© 2026 LearnFast</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="transition hover:text-slate-300">Terms</Link>
            <Link href="/security" className="transition hover:text-slate-300">Security</Link>
            <Link href="/dpa" className="transition hover:text-slate-300">DPA</Link>
            <a href="mailto:info@learnfastapp.com" className="transition hover:text-slate-300">
              info@learnfastapp.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
