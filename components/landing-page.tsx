"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useSetLocale } from "@/lib/i18n";
import { LANDING_COPY } from "@/lib/landing-copy";

const RED = "#d13b1a";

// Structural data (colors, icons, image paths, citation years) — locale-independent.
// Translatable text lives in lib/landing-copy.ts and is zipped in by index below.
const DIMENSION_STYLE = [
  { color: "#8b5cf6", research: "Cognitive Load Theory · Sweller, 1988" },
  { color: "#f59e0b", research: "Vocal Dynamism Research · Burgoon & Saine, 1978" },
  { color: "#22d3ee", research: "Narrative Transportation Theory · Green & Brock, 2000" },
  { color: "#34d399", research: "Dual Coding Theory · Paivio, 1971" },
  { color: "#f472b6", research: "Rapport Theory · Tickle-Degnen & Rosenthal, 1990" },
];

const FEATURE_ICONS = ["🧠", "🎙️", "📡", "📈", "🏆", "🎯", "🤝"];

const SIGNAL_STYLE = [
  { color: "#f59e0b", border: "border-amber-500/30", bg: "bg-amber-500/[0.06]" },
  { color: "#8b5cf6", border: "border-violet-500/30", bg: "bg-violet-500/[0.06]" },
  { color: "#22d3ee", border: "border-cyan-500/30", bg: "bg-cyan-500/[0.06]" },
];

const AI_SPOTLIGHT_ICONS = ["🎙️", "💬", "🎯", "💡", "📊", "🏭"];
const REHEARSAL_ICONS = ["🎙️", "🧠", "✏️", "📌"];
const FREE_CTA_EMOJIS = ["🎯", "📊", "🧠"];

const HOW_IT_WORKS_STYLE = [
  { image: "/onboard-2.jpg", objectPosition: "object-center" },
  { image: "/onboard-1.jpg", objectPosition: "object-top" },
  { image: "/onboard-3.jpg", objectPosition: "object-bottom sm:object-top", border: "border-violet-500/20" },
  { image: "/onboard-4.jpg", objectPosition: "object-top", border: "border-violet-500/20" },
];

const LEADERBOARD_ROWS = [
  { rank: 1, nick: "PresentPro", score: 88, pct: 99, medal: "🥇" },
  { rank: 2, nick: "SalesElite", score: 84, pct: 97, medal: "🥈" },
  { rank: 3, nick: "Boardroom_K", score: 81, pct: 94, medal: "🥉" },
  { rank: 4, nick: "Coach_M", score: 78, pct: 91, medal: null },
  { rank: 5, nick: "Keynote_J", score: 76, pct: 88, medal: null },
];

const FOOTER_HREFS = ["#product", "#how-it-works", "#pricing", "#why"];
const LEGAL_LINKS: Array<["privacy" | "terms" | "security" | "dpa", string]> = [
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["security", "/security"],
  ["dpa", "/dpa"],
];

export default function LandingPage() {
  const router = useRouter();
  const goToLogin = () => router.push("/auth/login");
  const locale = useLocale();
  const setLocale = useSetLocale();
  const c = LANDING_COPY[locale];

  const [proEmail, setProEmail] = useState("");
  const [proSubmitted, setProSubmitted] = useState(false);
  const [proLoading, setProLoading] = useState(false);

  async function handleProNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!proEmail.trim()) return;
    setProLoading(true);
    try {
      await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: proEmail }),
      });
    } finally {
      setProLoading(false);
      setProSubmitted(true);
    }
  }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-[#08090f] text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 lg:px-12 bg-[#08090f]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image src="/icon-mark.png" alt="LearnFast" width={32} height={23} />
          <span className="text-base font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-widest text-slate-400">
          <a href="#product"      className="hover:text-white transition">{c.nav.product}</a>
          <a href="#how-it-works" className="hover:text-white transition">{c.nav.howItWorks}</a>
          <a href="#pricing"      className="hover:text-white transition">{c.nav.pricing}</a>
          <a href="#why"          className="hover:text-white transition">{c.nav.why}</a>
        </div>
        <div className="flex items-center gap-3">
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
          <button onClick={goToLogin} className="hidden sm:block text-xs text-slate-400 hover:text-white transition px-3 py-2">{c.nav.signIn}</button>
          <Link
            href="/try"
            className="hidden md:block text-xs font-bold px-4 py-2.5 text-white rounded-sm transition whitespace-nowrap border border-white/20 hover:border-white/40"
          >
            {c.nav.freeAiAssessment}
          </Link>
          <button onClick={goToLogin} className="text-xs font-bold px-4 py-2.5 text-white rounded-sm transition whitespace-nowrap" style={{ backgroundColor: RED }}>
            {c.nav.startFree}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative text-center pt-36 pb-0 px-5 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(109,40,217,0.22) 0%, transparent 60%)" }} />

        <p className="relative text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase mb-6">
          {c.hero.eyebrow}
        </p>

        {/* Personal / Business toggle */}
        <div className="relative inline-flex items-center gap-1 bg-white/[0.05] border border-white/10 rounded-full p-1 mb-8">
          <span className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: RED }}>
            {c.hero.personal}
          </span>
          <a
            href="/enterprise"
            className="px-5 py-2 rounded-full text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {c.hero.business}
          </a>
        </div>
        <p className="relative max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 font-light italic mb-4 leading-snug">
          {c.hero.italic}
        </p>
        <h1 className="relative text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight mb-6">
          {c.hero.h1}
        </h1>
        <p className="relative max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed mb-2">
          {c.hero.body}
        </p>
        <p className="relative text-sm text-slate-500 mb-10">{c.hero.footnote}</p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition w-full sm:w-auto" style={{ backgroundColor: RED }}>
            {c.hero.cta1}
          </button>
          <Link href="/try" className="px-8 py-4 text-sm font-semibold text-slate-300 border border-white/20 hover:border-white/40 hover:text-white transition rounded-sm w-full sm:w-auto text-center">
            {c.hero.cta2}
          </Link>
        </div>

        {/* 3-device preview */}
        <div className="relative mx-auto w-full max-w-6xl flex items-end justify-center gap-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-48 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(109,40,217,0.28) 0%, transparent 70%)" }} />
          <div className="hidden md:block relative w-44 lg:w-56 shrink-0 translate-x-8 lg:translate-x-12 z-10" style={{ marginBottom: "-2px" }}>
            <Image src="/phone-preview-2.png" alt="LearnFast — performance over time" width={400} height={600} className="w-full object-contain drop-shadow-2xl" />
          </div>
          <div className="relative w-full max-w-3xl shrink z-20">
            <Image src="/app-preview.png" alt="LearnFast — live session results" width={1200} height={750} className="w-full object-contain drop-shadow-2xl" priority />
          </div>
          <div className="hidden md:block relative w-44 lg:w-56 shrink-0 -translate-x-8 lg:-translate-x-12 z-10" style={{ marginBottom: "-2px" }}>
            <Image src="/phone-preview.png" alt="LearnFast — live audience scores" width={400} height={600} className="w-full object-contain drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* ── TAGLINE BAR ── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-4 px-5 text-center">
        <p className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase">
          {c.tagline}
        </p>
      </div>

      {/* ── THREE-SIGNAL MODEL ── */}
      <section id="product" className="py-16 sm:py-24 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">{c.threeSignal.eyebrow}</p>
          <h2 className="text-3xl sm:text-5xl font-light text-slate-400 text-center leading-none mb-1">{c.threeSignal.h2Light}</h2>
          <h2 className="text-2xl sm:text-5xl font-black text-center leading-none mb-4">{c.threeSignal.h2Bold}</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
            {c.threeSignal.sub}
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {SIGNAL_STYLE.map((style, i) => {
              const sig = c.threeSignal.signals[i];
              return (
                <div key={sig.label} className={`rounded-2xl border ${style.border} ${style.bg} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: style.color }}>{sig.label}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{sig.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{sig.body}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center max-w-3xl mx-auto">
            <p className="text-sm text-slate-300 leading-relaxed">
              &ldquo;{c.threeSignal.quote}&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">{c.features.eyebrow}</p>
          <h2 className="text-3xl sm:text-5xl font-light text-slate-400 text-center leading-none mb-1">{c.features.h2Light}</h2>
          <h2 className="text-2xl sm:text-5xl font-black text-center leading-none mb-12">{c.features.h2Bold}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_ICONS.map((icon, i) => {
              const f = c.features.items[i];
              return (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-[#0f1118] p-6 sm:p-7">
                  <p className="text-3xl mb-4">{icon}</p>
                  <p className="font-bold text-sm uppercase tracking-wider mb-3">{f.title}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">{c.howItWorks.eyebrow}</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">{c.howItWorks.h2Light}</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-16">{c.howItWorks.h2Bold}</h2>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STYLE.map((style, i) => {
              const step = c.howItWorks.steps[i];
              return (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <p className="text-6xl font-black text-white/20 leading-none mb-4">{String(i + 1).padStart(2, "0")}</p>
                  <div className={`w-full rounded-2xl overflow-hidden border ${style.border ?? "border-white/10"} bg-[#0f1118] mb-5`} style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                    <Image src={style.image} alt={step.title} width={400} height={711} className={`w-full h-full object-cover ${style.objectPosition}`} />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-2">{step.title}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI ASSESSMENT SPOTLIGHT ── */}
      <section className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-8 sm:p-12 lg:p-16">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-xs font-semibold tracking-[0.25em] text-amber-400 uppercase">{c.aiSpotlight.label}</p>
            </div>
            <h2 className="text-3xl sm:text-5xl font-light text-slate-300 leading-none mb-1">{c.aiSpotlight.h2Light}</h2>
            <h2 className="text-3xl sm:text-5xl font-black leading-none mb-6 text-amber-400">{c.aiSpotlight.h2Bold}</h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-2xl mb-10">
              {c.aiSpotlight.body}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {AI_SPOTLIGHT_ICONS.map((icon, i) => {
                const item = c.aiSpotlight.items[i];
                return (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-[#0f1118] p-4">
                    <p className="text-xl mb-2">{icon}</p>
                    <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
                {c.aiSpotlight.cta}
              </button>
              <p className="text-xs text-slate-600 self-center">{c.aiSpotlight.footnote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REHEARSAL MODE ── */}
      <section className="py-20 sm:py-28 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-violet-500/20 bg-violet-500/[0.04] p-8 sm:p-12 lg:p-16">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shrink-0" />
              <p className="text-xs font-semibold tracking-[0.25em] text-violet-400 uppercase">{c.rehearsalSpotlight.label}</p>
            </div>
            <h2 className="text-3xl sm:text-5xl font-light text-slate-300 leading-none mb-1">{c.rehearsalSpotlight.h2Light}</h2>
            <h2 className="text-3xl sm:text-5xl font-black leading-none mb-6 text-violet-400">{c.rehearsalSpotlight.h2Bold}</h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-2xl mb-10">
              {c.rehearsalSpotlight.body}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mb-10">
              {REHEARSAL_ICONS.map((icon, i) => {
                const item = c.rehearsalSpotlight.items[i];
                return (
                  <div key={item.title} className="rounded-xl border border-violet-500/10 bg-[#0f1118] p-5">
                    <p className="text-xl mb-2">{icon}</p>
                    <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
                {c.rehearsalSpotlight.cta}
              </button>
              <p className="text-xs text-slate-600 self-center">{c.rehearsalSpotlight.footnote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRY LEADERBOARDS ── */}
      <section className="py-16 sm:py-20 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                <p className="text-xs font-semibold tracking-[0.25em] text-violet-400 uppercase">{c.leaderboards.label}</p>
              </div>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-400 leading-none mb-1">{c.leaderboards.h2Light}</h2>
              <h2 className="text-2xl sm:text-4xl font-black leading-none mb-6">{c.leaderboards.h2Bold}</h2>
              <p className="text-base text-slate-400 leading-relaxed mb-6">
                {c.leaderboards.body}
              </p>
              <ul className="space-y-3 text-sm text-slate-400 mb-8">
                {c.leaderboards.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-violet-400 shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
                {c.leaderboards.cta}
              </button>
            </div>

            {/* Leaderboard visual mockup */}
            <div className="min-w-0 rounded-2xl border border-white/10 bg-[#111827] p-5 font-mono text-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                <span className="text-violet-400 font-sans text-[10px] font-bold tracking-widest uppercase">{c.leaderboards.mockupCategory}</span>
              </div>
              <div className="grid grid-cols-[32px_1fr_52px_52px] gap-0 border-b border-white/10 pb-2 mb-2 text-slate-600">
                <span>#</span><span>{c.leaderboards.mockupNickname}</span><span className="text-right">{c.leaderboards.mockupScore}</span><span className="text-right">{c.leaderboards.mockupPercentile}</span>
              </div>
              {LEADERBOARD_ROWS.map((row) => (
                <div key={row.rank} className={`grid grid-cols-[32px_1fr_52px_52px] gap-0 py-2.5 border-b border-white/5 last:border-0 ${row.rank === 4 ? "bg-amber-500/[0.06] -mx-5 px-5 text-amber-300 font-sans font-semibold" : "text-slate-300 font-sans"}`}>
                  <span className="text-slate-500">{row.medal ?? row.rank}</span>
                  <span className="truncate">{row.nick}{row.rank === 4 && <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">{c.leaderboards.mockupYou}</span>}</span>
                  <span className="text-right" style={{ color: row.rank === 4 ? "#f59e0b" : undefined }}>{row.score}</span>
                  <span className="text-right text-slate-500">{row.pct}th</span>
                </div>
              ))}
              <p className="mt-3 text-[10px] text-slate-700 font-sans">{c.leaderboards.mockupCaption}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 DIMENSIONS ── */}
      <section className="py-16 sm:py-24 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">{c.dimensionsSection.eyebrow}</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">{c.dimensionsSection.h2Light}</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-6">{c.dimensionsSection.h2Bold}</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
            {c.dimensionsSection.body}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSION_STYLE.map((style, i) => {
              const d = c.dimensionsSection.dimensions[i];
              return (
                <div key={d.name} className="rounded-xl border border-white/10 bg-[#0f1118] p-5 flex gap-4 items-start hover:border-white/20 transition">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: style.color }} />
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wider mb-1">{d.name}</p>
                    <p className="text-sm text-slate-400 leading-relaxed mb-2">{d.desc}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{style.research}</p>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-center sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-slate-500 text-center leading-relaxed">
                {c.dimensionsSection.footerCard}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE AI ASSESSMENT CTA ── */}
      <section id="why" className="py-20 sm:py-28 px-5 lg:px-12 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(109,40,217,0.12) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-xs font-semibold tracking-[0.3em] text-violet-400 uppercase mb-4">{c.freeCta.eyebrow}</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 leading-none mb-1">{c.freeCta.h2Light}</h2>
          <h2 className="text-3xl sm:text-6xl font-black leading-none mb-6">{c.freeCta.h2Bold}</h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-3 max-w-xl mx-auto">
            {c.freeCta.body1}
          </p>
          <p className="text-sm text-slate-500 mb-10">{c.freeCta.body2}</p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {FREE_CTA_EMOJIS.map((emoji, i) => {
              const card = c.freeCta.cards[i];
              return (
                <div key={card.title} className="rounded-xl border border-white/10 bg-[#0f1118] p-5">
                  <p className="text-2xl mb-3">{emoji}</p>
                  <p className="text-sm font-bold text-white mb-1.5">{card.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.body}</p>
                </div>
              );
            })}
          </div>

          <Link
            href="/try"
            className="inline-block px-10 py-5 text-sm font-bold tracking-wider text-white rounded-sm transition"
            style={{ backgroundColor: RED }}
          >
            {c.freeCta.cta}
          </Link>
          <p className="mt-4 text-xs text-slate-600">{c.freeCta.footnote}</p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">{c.pricing.eyebrow}</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">{c.pricing.h2Light}</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-16">{c.pricing.h2Bold}</h2>

          <div className="grid gap-5 md:grid-cols-3">

            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-7 sm:p-8">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">{c.pricing.free.label}</p>
              <p className="text-5xl font-black mb-1">£0</p>
              <p className="text-sm text-slate-500 mb-8">{c.pricing.free.footnote}</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {c.pricing.free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="text-green-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="w-full py-3.5 text-sm font-bold border border-white/20 hover:border-white/40 text-white transition rounded-sm">
                {c.pricing.free.cta}
              </button>
            </div>

            {/* Lite */}
            <div className="rounded-2xl border p-7 sm:p-8 relative" style={{ borderColor: `${RED}44`, background: "linear-gradient(135deg, #1a0d0a 0%, #0f1118 100%)" }}>
              <div className="absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-sm text-white tracking-wider" style={{ backgroundColor: RED }}>
                {c.pricing.lite.badge}
              </div>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">{c.pricing.lite.label}</p>
              <p className="text-5xl font-black mb-1">£3.99<span className="text-lg font-normal text-slate-400">{c.pricing.lite.perMo}</span></p>
              <p className="text-sm text-slate-500 mb-8">{c.pricing.lite.footnote}</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {c.pricing.lite.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="shrink-0" style={{ color: RED }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="w-full py-3.5 text-sm font-bold text-white transition rounded-sm" style={{ backgroundColor: RED }}>
                {c.pricing.lite.cta}
              </button>
              <p className="text-center text-xs text-slate-600 mt-3">{c.pricing.lite.note}</p>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-violet-500/30 bg-[#0f1118] p-7 sm:p-8 relative flex flex-col" style={{ background: "linear-gradient(135deg, #0d0b1a 0%, #0f1118 100%)" }}>
              <div className="absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-sm text-violet-300 tracking-wider border border-violet-500/40 bg-violet-500/10">
                {c.pricing.pro.badge}
              </div>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">{c.pricing.pro.label}</p>
              <p className="text-5xl font-black mb-1 text-slate-300">£9.99<span className="text-lg font-normal text-slate-500">{c.pricing.pro.perMo}</span></p>
              <p className="text-sm text-slate-500 mb-8">{c.pricing.pro.footnote}</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                {c.pricing.pro.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="text-violet-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              {proSubmitted ? (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-violet-300">{c.pricing.pro.submittedTitle}</p>
                  <p className="text-xs text-slate-500 mt-1">{c.pricing.pro.submittedBody}</p>
                </div>
              ) : (
                <form onSubmit={handleProNotify} className="space-y-2">
                  <input
                    type="email"
                    required
                    placeholder={c.pricing.pro.emailPlaceholder}
                    value={proEmail}
                    onChange={(e) => setProEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#1a1f2e] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 transition"
                  />
                  <button
                    type="submit"
                    disabled={proLoading}
                    className="w-full py-3 text-sm font-bold text-white border border-violet-500/40 hover:border-violet-400 hover:bg-violet-500/10 transition rounded-lg disabled:opacity-50"
                  >
                    {proLoading ? c.pricing.pro.saving : c.pricing.pro.notifyCta}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-10">
            {c.pricing.teamLine}{" "}
            <a href="mailto:info@learnfastapp.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition">
              {c.pricing.teamCta}
            </a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 sm:py-32 px-5 lg:px-12 text-center bg-[#0a0b12] border-t border-white/5">
        <div className="absolute pointer-events-none inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(209,59,26,0.08) 0%, transparent 70%)" }} />
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-5">{c.finalCta.eyebrow}</p>
        <h2 className="text-3xl sm:text-6xl font-light text-slate-400 leading-tight mb-1">{c.finalCta.h2Light}</h2>
        <h2 className="text-3xl sm:text-6xl font-black leading-tight mb-10">{c.finalCta.h2Bold}</h2>
        <button onClick={goToLogin} className="px-10 py-5 text-sm font-bold tracking-wider text-white transition rounded-sm" style={{ backgroundColor: RED }}>
          {c.finalCta.cta}
        </button>
        <p className="mt-4 text-xs text-slate-600">{c.finalCta.footnote}</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 bg-[#08090f] py-10 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/icon-mark.png" alt="LearnFast" width={28} height={20} />
              <span className="text-sm font-bold" style={{ color: "#5bb8f5" }}>
                LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
              </span>
            </div>
            <button onClick={goToLogin} className="px-5 py-3 text-xs font-bold text-white rounded-sm transition" style={{ backgroundColor: RED }}>
              {c.footer.startNow}
            </button>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">{c.footer.contact}</p>
            <a href="mailto:info@learnfastapp.com" className="text-sm text-slate-500 hover:text-white transition">info@learnfastapp.com</a>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">{c.footer.navigation}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              {FOOTER_HREFS.map((href, i) => (
                <li key={href}><a href={href} className="hover:text-white transition">{c.footer.navItems[i]}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">{c.footer.followUs}</p>
            <div className="flex gap-3">
              {[{ label: "Instagram", icon: "IG" }, { label: "X", icon: "𝕏" }, { label: "LinkedIn", icon: "in" }].map((s) => (
                <div key={s.label} className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold text-slate-400 hover:border-white/60 hover:text-white transition cursor-pointer">
                  {s.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>{c.footer.copyright(new Date().getFullYear())}</p>
          <div className="flex gap-6">
            {LEGAL_LINKS.map(([key, href]) => (
              <a key={href} href={href} className="hover:text-slate-400 transition">{c.footer[key]}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
