"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, X, Phone, ArrowRight } from "lucide-react";
import { useLocale, useSetLocale } from "@/lib/i18n";
import { ENTERPRISE_COPY } from "@/lib/enterprise-copy";

// Structural data (colors, quotes, testimonial names/images) — locale-independent.
// Translatable text lives in lib/enterprise-copy.ts and is zipped in by index below.
const DIMENSION_COLOR = [
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
];

const FEATURE_ICONS = ["📡", "📈", "🔍", "🧠", "📋", "💬", "📚", "🤝", "🎨"];

const COMPARISON_TYPES: Array<{ learnfast: "check"; competitor: "check" | "cross" | "call" }> = [
  { learnfast: "check", competitor: "call" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "check" },
  { learnfast: "check", competitor: "check" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
  { learnfast: "check", competitor: "cross" },
];

// Testimonial quotes and names are deliberately NOT translated — see note in
// lib/enterprise-copy.ts. Only the role/title caption is localized.
const TESTIMONIALS = [
  {
    image: "/testimonials/sydney-swans.png",
    alt: "Sydney Swans",
    quote: "“Conference presenting is a strange skill — high stakes, infrequent reps, and almost no honest feedback. LearnFast fills that gap. I rehearse the talk, get scored on how it actually comes across, and refine the delivery before I'm in front of a room full of peers. By the time I step on stage, the rough edges have already been found and fixed. Invaluable preparation tool.”",
    name: "Shane Lehane",
  },
  {
    image: "/testimonials/ufc-pi.png",
    alt: "UFC Performance Institute",
    quote: "“As a coach, how you deliver a message is half the job. LearnFast has been invaluable for rehearsing presentations before the real thing — you present, the audience scores what they actually experienced, and you get honest, live feedback instead of a polite nod. It's changed how I prepare, and my delivery has improved because of it.”",
    name: "Dean Amasinger",
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
  const locale = useLocale();
  const setLocale = useSetLocale();
  const c = ENTERPRISE_COPY[locale];

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
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setLocale("en")}
                className={locale === "en" ? "text-white" : "text-slate-500 hover:text-white transition"}
                aria-current={locale === "en"}
              >
                EN
              </button>
              <span className="text-slate-700">/</span>
              <button
                onClick={() => setLocale("fr")}
                className={locale === "fr" ? "text-white" : "text-slate-500 hover:text-white transition"}
                aria-current={locale === "fr"}
              >
                FR
              </button>
            </div>
            <Link href="/auth/login" className="hidden sm:block text-sm text-slate-300 transition hover:text-white">
              {c.nav.signIn}
            </Link>
            <Link
              href="/org/signup"
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              {c.nav.getStarted}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-violet-400">
          {c.hero.eyebrow}
        </p>

        {/* Personal / Business toggle */}
        <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mb-8">
          <Link
            href="/"
            className="px-5 py-2 rounded-full text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {c.hero.personal}
          </Link>
          <span className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-violet-600">
            {c.hero.business}
          </span>
        </div>

        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {c.hero.h1Part1}
          <span className="text-violet-400">{c.hero.h1Highlight}</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
          {c.hero.body}
        </p>

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-400"
          >
            {c.hero.cta1}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a] px-8 py-3.5 font-semibold text-slate-300 transition hover:border-violet-500/50 hover:text-white"
          >
            {c.hero.cta2}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {c.hero.badges.map((label) => (
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
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-10">{c.problemBand.eyebrow}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {c.problemBand.items.map(({ quote, fix }) => (
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
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">{c.howItWorks.h2}</h2>
          <p className="mb-14 text-center text-slate-400">{c.howItWorks.sub}</p>

          <div className="grid gap-8 md:grid-cols-3">
            {c.howItWorks.steps.map(({ title, time, body }, i) => (
              <div key={title} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-7">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl font-black text-violet-500/40">{String(i + 1).padStart(2, "0")}</span>
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
            {c.stats.map(({ stat, label }) => (
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
          <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">{c.testimonials.h2}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-slate-400">{c.testimonials.sub}</p>

          <div className="grid gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="flex gap-4 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
                <div className="flex-shrink-0">
                  <Image src={t.image} alt={t.alt} width={84} height={84} className="rounded-md object-contain" />
                </div>
                <div>
                  <p className="text-sm text-slate-300 italic leading-relaxed mb-3">{t.quote}</p>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{c.testimonials.roles[i]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">{c.features.h2}</h2>
        <p className="mb-14 text-center text-slate-400 max-w-2xl mx-auto">
          {c.features.sub}
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_ICONS.map((icon, i) => {
            const f = c.features.items[i];
            return (
              <div key={f.title} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
                <p className="text-3xl mb-4">{icon}</p>
                <p className="font-bold text-sm uppercase tracking-wider mb-3 text-white">{f.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing & comparison */}
      <section id="pricing" className="border-t border-[#1e293b] bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
              {c.pricing.h2}
            </h2>
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-8 py-5 text-center">
                <p className="text-3xl font-black text-white">£15</p>
                <p className="mt-1 text-sm text-slate-400">{c.pricing.perSeatMo}</p>
                <p className="mt-2 text-xs font-semibold text-violet-400">{c.pricing.fiveSeatMin}</p>
              </div>
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] px-8 py-5 text-center">
                <p className="text-3xl font-black text-white">£12</p>
                <p className="mt-1 text-sm text-slate-400">{c.pricing.perSeatMoAnnual}</p>
                <p className="mt-2 text-xs font-semibold text-green-400">{c.pricing.save20}</p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-2xl border border-[#1e293b]">
            <div className="min-w-[520px] bg-[#0f172a]">
              <div className="grid grid-cols-3 border-b border-[#1e293b] bg-[#0a0f1a] px-6 py-4">
                <p className="text-sm font-semibold text-slate-400">{c.pricing.tableFeature}</p>
                <p className="text-sm font-semibold text-violet-400">{c.pricing.tableLearnfast}</p>
                <p className="text-sm font-semibold text-slate-400">Yoodli / Orai</p>
              </div>

              <div className="divide-y divide-[#1e293b]">
                {c.pricing.comparisonRows.map((row, i) => (
                  <div key={row.feature} className="grid grid-cols-3 items-center gap-4 px-6 py-4">
                    <p className="text-sm text-slate-300">{row.feature}</p>
                    <CellIcon type={COMPARISON_TYPES[i].learnfast} label={row.learnfastLabel} />
                    <CellIcon type={COMPARISON_TYPES[i].competitor} label={row.competitorLabel} />
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
            {c.dimensionsSection.h2}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-slate-400">
            {c.dimensionsSection.sub}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DIMENSION_COLOR.map((color, i) => {
              const d = c.dimensionsSection.dimensions[i];
              return (
                <div
                  key={d.name}
                  className={`rounded-2xl border p-5 ${color.includes("purple") ? "border-purple-500/30 bg-purple-500/10" : color.includes("amber") ? "border-amber-500/30 bg-amber-500/10" : color.includes("cyan") ? "border-cyan-500/30 bg-cyan-500/10" : color.includes("emerald") ? "border-emerald-500/30 bg-emerald-500/10" : "border-pink-500/30 bg-pink-500/10"}`}
                >
                  <span className={`mb-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
                    {d.name}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-400">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-28 text-center">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-violet-400">
          {c.cta.eyebrow}
        </p>
        <h2 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl">
          {c.cta.h2}
        </h2>
        <p className="mb-10 text-lg text-slate-400 leading-relaxed">
          {c.cta.body}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/org/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-8 py-3.5 font-semibold text-white transition hover:bg-violet-400"
          >
            {c.cta.cta1}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:info@learnfastapp.com"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#0f172a] px-8 py-3.5 font-semibold text-slate-300 transition hover:border-violet-500/50 hover:text-white"
          >
            {c.cta.cta2}
          </a>
        </div>
        <p className="mt-6 text-sm text-slate-600">{c.cta.footnote}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>© 2026 LearnFast</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition hover:text-slate-300">{c.footer.privacy}</Link>
            <Link href="/terms" className="transition hover:text-slate-300">{c.footer.terms}</Link>
            <Link href="/security" className="transition hover:text-slate-300">{c.footer.security}</Link>
            <Link href="/dpa" className="transition hover:text-slate-300">{c.footer.dpa}</Link>
            <a href="mailto:info@learnfastapp.com" className="transition hover:text-slate-300">
              info@learnfastapp.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
