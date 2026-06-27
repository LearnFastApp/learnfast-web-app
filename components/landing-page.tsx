"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RED = "#d13b1a";

const DIMENSIONS = [
  { name: "Clarity",       color: "#8b5cf6", desc: "How clearly your message and structure came across to the room." },
  { name: "Energy",        color: "#f59e0b", desc: "The presence, vocal delivery and energy you brought to the room." },
  { name: "Engagement",    color: "#22d3ee", desc: "How well you held attention and kept the audience invested throughout." },
  { name: "Understanding", color: "#34d399", desc: "How well the audience grasped the core ideas you shared." },
  { name: "Connection",    color: "#f472b6", desc: "How personally connected the audience felt to you and your content." },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI Assessment",
    body: "Upload your recording and receive AI-scored coaching across all five dimensions in 1–3 minutes. Vocal stats, highlight quotes, improvement tips and a full written rationale — all from a single file.",
  },
  {
    icon: "📡",
    title: "Three-Signal Intelligence",
    body: "Combine AI scores, live audience feedback and your own self-reflection on a single radar. Where the three signals diverge is exactly where your growth lives.",
  },
  {
    icon: "📈",
    title: "Comparative Coaching",
    body: "Your AI feedback evolves with every session. Each new assessment references your full history — noting improvements, calling out persistent patterns and adapting advice to your trajectory.",
  },
  {
    icon: "🏆",
    title: "Industry Leaderboards",
    body: "See how you rank against peers in your sector. Leaderboards by dimension — Clarity, Energy, Connection and more — updated with every AI assessment you complete.",
  },
  {
    icon: "🎯",
    title: "Dimension-Matched Resources",
    body: "Based on YOUR scores, LearnFast surfaces the most relevant articles, TED Talks, videos and podcasts — matched to your exact development areas, not a generic library.",
  },
  {
    icon: "🔁",
    title: "Reflective Practice Loop",
    body: "Self-score alongside your audience, set a focus commitment for your next session, and track progress over time. Continuous improvement, built into every session.",
  },
];

const SIGNALS = [
  {
    color: "#f59e0b",
    border: "border-amber-500/30",
    bg: "bg-amber-500/[0.06]",
    label: "AI",
    title: "The Recording",
    body: "Upload your recording and an AI scores you across all five dimensions. Vocal statistics, exact quotes from your transcript, and specific improvement tips — delivered in minutes.",
  },
  {
    color: "#8b5cf6",
    border: "border-violet-500/30",
    bg: "bg-violet-500/[0.06]",
    label: "Audience",
    title: "The Room",
    body: "Your audience scores you in real time via QR code. Completely anonymous. What they actually felt — not what they were polite enough to say.",
  },
  {
    color: "#22d3ee",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/[0.06]",
    label: "Self",
    title: "Your Perception",
    body: "How did YOU think it went? Your self-assessment alongside AI and audience scores reveals whether your internal compass is calibrated — or not.",
  },
];

const PARTNERS = [
  { name: "Harvard Business Review", style: "font-serif font-bold text-white text-sm" },
  { name: "BBC Maestro",             style: "font-bold text-white text-sm tracking-wide" },
  { name: "Big Think",               style: "font-bold text-orange-400 text-sm" },
  { name: "Fortune",                 style: "font-serif font-black text-white text-sm" },
  { name: "The New York Times",      style: "font-serif text-white text-sm" },
  { name: "Farnam Street",           style: "font-bold text-white text-sm tracking-wider" },
];

export default function LandingPage() {
  const router = useRouter();
  const goToLogin = () => router.push("/auth/login");

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
          <a href="#product"      className="hover:text-white transition">PRODUCT</a>
          <a href="#how-it-works" className="hover:text-white transition">HOW IT WORKS</a>
          <a href="#pricing"      className="hover:text-white transition">PRICING</a>
          <a href="#why"          className="hover:text-white transition">WHY</a>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToLogin} className="text-xs text-slate-400 hover:text-white transition px-3 py-2">Sign in</button>
          <a
            href="https://ollie-0ffouvku.scoreapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:block text-xs font-bold px-4 py-2.5 text-white rounded-sm transition whitespace-nowrap border border-white/20 hover:border-white/40"
          >
            FREE LEADERSHIP ASSESSMENT
          </a>
          <button onClick={goToLogin} className="text-xs font-bold px-4 py-2.5 text-white rounded-sm transition whitespace-nowrap" style={{ backgroundColor: RED }}>
            START FREE →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative text-center pt-36 pb-0 px-5 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(109,40,217,0.22) 0%, transparent 60%)" }} />

        <p className="relative text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase mb-5">
          AI-Powered Presentation Intelligence
        </p>
        <h1 className="relative text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-tight tracking-tight text-slate-400 mb-1">
          INTRODUCING
        </h1>
        <h1 className="relative text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight mb-6">
          THE LEARNFAST APP
        </h1>
        <p className="relative max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed mb-2">
          The only platform that combines AI analysis, live audience feedback and self-reflection into a single coaching intelligence — scored across the five dimensions of great presenting.
        </p>
        <p className="relative text-sm text-slate-500 mb-10">No download required · works on any device · available in English and French.</p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition w-full sm:w-auto" style={{ backgroundColor: RED }}>
            START FREE — 2 SESSIONS ON US
          </button>
          <button onClick={goToLogin} className="px-8 py-4 text-sm font-semibold text-slate-300 border border-white/20 hover:border-white/40 hover:text-white transition rounded-sm w-full sm:w-auto">
            SIGN IN →
          </button>
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
          Your ideas are only as powerful as how they are delivered
        </p>
      </div>

      {/* ── WHAT WE DO ── */}
      <section id="product" className="py-20 sm:py-28 px-5 lg:px-12 max-w-4xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4">Feedback Intelligence</p>
        <h2 className="text-3xl sm:text-6xl font-light text-slate-400 leading-none mb-1">WHAT</h2>
        <h2 className="text-3xl sm:text-6xl font-black leading-none mb-8">WE DO</h2>
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-6">
          LearnFast is an AI-powered presentation coaching platform. Every session generates three independent signals — your AI assessment, your audience's live feedback, and your own self-reflection — combined on a single radar chart to give you the most complete picture of your performance available anywhere.
        </p>
        <p className="text-sm text-slate-500 max-w-xl mx-auto mb-10">
          Then we use your scores to surface curated learning resources, track your progress over time, and benchmark you against professionals in your industry.
        </p>
        <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
          START FREE NOW
        </button>
      </section>

      {/* ── THREE-SIGNAL MODEL ── */}
      <section className="py-16 sm:py-24 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Proprietary Methodology</p>
          <h2 className="text-3xl sm:text-5xl font-light text-slate-400 text-center leading-none mb-1">THE THREE-SIGNAL</h2>
          <h2 className="text-3xl sm:text-5xl font-black text-center leading-none mb-4">INTELLIGENCE MODEL</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
            Most feedback tools give you one perspective. LearnFast gives you three — simultaneously. Where they diverge is where your growth lives.
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {SIGNALS.map((sig) => (
              <div key={sig.label} className={`rounded-2xl border ${sig.border} ${sig.bg} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sig.color }} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: sig.color }}>{sig.label}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{sig.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{sig.body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center max-w-3xl mx-auto">
            <p className="text-sm text-slate-300 leading-relaxed">
              "The gap between how you think you performed and how your audience actually experienced you is the single most important data point in your development as a presenter."
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Everything You Need</p>
          <h2 className="text-3xl sm:text-5xl font-light text-slate-400 text-center leading-none mb-1">BUILT FOR</h2>
          <h2 className="text-3xl sm:text-5xl font-black text-center leading-none mb-12">SERIOUS PRESENTERS</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-[#0f1118] p-6 sm:p-7">
                <p className="text-3xl mb-4">{f.icon}</p>
                <p className="font-bold text-sm uppercase tracking-wider mb-3">{f.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Simple by Design</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">HOW IT</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-16">WORKS</h2>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">01</p>
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-2.jpg" alt="Create a session" width={400} height={711} className="w-full h-full object-cover object-center" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Create a Session</p>
              <p className="text-sm text-slate-400 leading-relaxed">Name your session and get a unique QR code and join link in seconds.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">02</p>
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-1.jpg" alt="Share with your audience" width={400} height={711} className="w-full h-full object-cover object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Share With Your Audience</p>
              <p className="text-sm text-slate-400 leading-relaxed">Display the QR or share the link. No app download, no account needed for your audience.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">03</p>
              <div className="w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-3.jpg" alt="Collect live feedback" width={400} height={711} className="w-full h-full object-cover object-bottom sm:object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Collect Live Feedback</p>
              <p className="text-sm text-slate-400 leading-relaxed">Watch scores arrive in real time across all 5 dimensions as your audience responds.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">04</p>
              <div className="w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-4.jpg" alt="Reflect and improve" width={400} height={711} className="w-full h-full object-cover object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Reflect, Track & Improve</p>
              <p className="text-sm text-slate-400 leading-relaxed">Self-score, add an AI assessment of your recording, and watch LearnFast surface the exact resources to close your gaps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI ASSESSMENT SPOTLIGHT ── */}
      <section className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-8 sm:p-12 lg:p-16">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-xs font-semibold tracking-[0.25em] text-amber-400 uppercase">AI Assessment</p>
            </div>
            <h2 className="text-3xl sm:text-5xl font-light text-slate-300 leading-none mb-1">YOUR RECORDING.</h2>
            <h2 className="text-3xl sm:text-5xl font-black leading-none mb-6 text-amber-400">YOUR COACHING. IN MINUTES.</h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-2xl mb-10">
              Upload any recording from a meeting, talk or practice session. Our AI transcribes the audio, scores your delivery across all five dimensions, and generates a detailed coaching report — complete with exact quotes from your transcript, vocal statistics and targeted improvement tips.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {[
                ["🎙️", "Vocal statistics", "Words per minute, filler word count, speaking duration and sentiment analysis."],
                ["💬", "Transcript highlights", "Exact quotes from your session flagged as strengths or development opportunities."],
                ["🎯", "Dimension rationale", "A written explanation of every score — not just a number, but the reasoning behind it."],
                ["💡", "Coaching tips", "Targeted, actionable advice for your three lowest-scoring dimensions."],
                ["📊", "Comparative feedback", "Each assessment references your history — noting progress, regression and persistent patterns."],
                ["🏭", "Industry context", "Your coaching is tailored to your professional sector for relevant, contextual advice."],
              ].map(([icon, title, desc]) => (
                <div key={title as string} className="rounded-xl border border-white/10 bg-[#0f1118] p-4">
                  <p className="text-xl mb-2">{icon}</p>
                  <p className="text-sm font-bold text-white mb-1">{title as string}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc as string}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
                START FREE NOW
              </button>
              <p className="text-xs text-slate-600 self-center">3 AI assessments per month on Lite · Unlimited on Pro</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRY LEADERBOARDS ── */}
      <section className="py-16 sm:py-20 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                <p className="text-xs font-semibold tracking-[0.25em] text-violet-400 uppercase">Premium Feature</p>
              </div>
              <h2 className="text-3xl sm:text-5xl font-light text-slate-400 leading-none mb-1">INDUSTRY</h2>
              <h2 className="text-3xl sm:text-5xl font-black leading-none mb-6">LEADERBOARDS</h2>
              <p className="text-base text-slate-400 leading-relaxed mb-6">
                See how you rank against peers in your sector. LearnFast builds real normative data from every AI assessment run on the platform — so your score isn't just a number, it's a percentile rank against Sales professionals, Healthcare leaders, Technology engineers and more.
              </p>
              <ul className="space-y-3 text-sm text-slate-400 mb-8">
                {[
                  "Ranked by dimension — Overall, Clarity, Energy, Engagement, Understanding, Connection",
                  "Percentile position against professionals in your industry",
                  "Anonymous by default — appear under a chosen nickname",
                  "Updated with every AI assessment you complete",
                  "Industry normative benchmarks build with every new user",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-violet-400 shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
                GET STARTED →
              </button>
            </div>

            {/* Leaderboard visual mockup */}
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 font-mono text-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                <span className="text-violet-400 font-sans text-[10px] font-bold tracking-widest uppercase">Sales & Business Development</span>
              </div>
              <div className="grid grid-cols-[32px_1fr_52px_52px] gap-0 border-b border-white/10 pb-2 mb-2 text-slate-600">
                <span>#</span><span>Nickname</span><span className="text-right">Score</span><span className="text-right">%ile</span>
              </div>
              {[
                { rank: 1, nick: "PresentPro",  score: 88, pct: 99, medal: "🥇" },
                { rank: 2, nick: "SalesElite",  score: 84, pct: 97, medal: "🥈" },
                { rank: 3, nick: "Boardroom_K", score: 81, pct: 94, medal: "🥉" },
                { rank: 4, nick: "Coach_M",     score: 78, pct: 91, medal: null },
                { rank: 5, nick: "Keynote_J",   score: 76, pct: 88, medal: null },
              ].map((row) => (
                <div key={row.rank} className={`grid grid-cols-[32px_1fr_52px_52px] gap-0 py-2.5 border-b border-white/5 last:border-0 ${row.rank === 4 ? "bg-amber-500/[0.06] -mx-5 px-5 text-amber-300 font-sans font-semibold" : "text-slate-300 font-sans"}`}>
                  <span className="text-slate-500">{row.medal ?? row.rank}</span>
                  <span className="truncate">{row.nick}{row.rank === 4 && <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">You</span>}</span>
                  <span className="text-right" style={{ color: row.rank === 4 ? "#f59e0b" : undefined }}>{row.score}</span>
                  <span className="text-right text-slate-500">{row.pct}th</span>
                </div>
              ))}
              <p className="mt-3 text-[10px] text-slate-700 font-sans">Based on most recent AI assessment · Connection dimension</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 DIMENSIONS ── */}
      <section className="py-16 sm:py-24 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Scored Across</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">THE</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-6">5 DIMENSIONS</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
            Every signal — AI, audience and self-reflection — scores you across the same five dimensions. One framework. Three perspectives. The complete picture.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSIONS.map((d) => (
              <div key={d.name} className="rounded-xl border border-white/10 bg-[#0f1118] p-5 flex gap-4 items-start hover:border-white/20 transition">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <div>
                  <p className="font-bold text-sm uppercase tracking-wider mb-1">{d.name}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-center sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-slate-500 text-center leading-relaxed">
                AI + Audience + Self-Reflection, all on one radar. The gaps between signals reveal your blind spots and your hidden strengths.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY / GET STARTED ── */}
      <section id="why" className="py-20 sm:py-28 px-5 lg:px-12 text-center bg-[#0a0b12] border-y border-white/5">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4">Made for Leaders</p>
        <h2 className="text-3xl sm:text-6xl font-light text-slate-400 leading-none mb-1">GET STARTED WITH</h2>
        <h2 className="text-3xl sm:text-6xl font-black leading-none mb-8">LEARNFAST TODAY</h2>
        <p className="max-w-xl mx-auto text-slate-400 leading-relaxed mb-10 text-sm sm:text-base">
          Whether you are a corporate trainer, team leader, sales professional or university lecturer — every great presenter started somewhere. LearnFast gives you the data, the AI coaching, the industry benchmarks and the resources to improve with every session.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button onClick={goToLogin} className="px-10 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition w-full sm:w-auto" style={{ backgroundColor: RED }}>
            START FREE NOW
          </button>
          <button onClick={goToLogin} className="px-10 py-4 text-sm font-semibold border border-white/20 hover:border-white/40 text-slate-300 hover:text-white transition rounded-sm w-full sm:w-auto">
            SIGN IN →
          </button>
        </div>
        <p className="text-xs text-slate-600">2 free sessions · no credit card required</p>
      </section>

      {/* ── EDUCATIONAL RESOURCES ── */}
      <section className="py-16 px-5 lg:px-12 border-b border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-start justify-center gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-3">Learning Resources From</p>
              <h2 className="text-3xl sm:text-5xl font-light text-slate-400 leading-none mb-1">EDUCATIONAL</h2>
              <h2 className="text-3xl sm:text-5xl font-black leading-none">PARTNERS</h2>
            </div>
            <div className="hidden sm:block">
              <div
                className="w-16 pt-3 pb-5 text-white text-[10px] font-bold tracking-widest text-center leading-relaxed"
                style={{ backgroundColor: RED, clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)" }}
              >
                <p>COMING</p><p>SOON</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-10">Learn and upskill with the best in their field — surfaced automatically based on your dimension scores.</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {PARTNERS.map((p) => (
              <span key={p.name} className={`${p.style} opacity-70 hover:opacity-100 transition`}>{p.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Pricing</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">START FREE,</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-16">SCALE WHEN READY</h2>

          <div className="grid gap-5 md:grid-cols-3">

            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-7 sm:p-8">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">Free</p>
              <p className="text-5xl font-black mb-1">£0</p>
              <p className="text-sm text-slate-500 mb-8">No credit card required</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {[
                  "2 feedback sessions",
                  "All 5 scoring dimensions",
                  "Real-time audience radar chart",
                  "Presenter self-reflection scores",
                  "Three-signal comparison view",
                  "Session notes & tags",
                  "Reflective practice log",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="text-green-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="w-full py-3.5 text-sm font-bold border border-white/20 hover:border-white/40 text-white transition rounded-sm">
                GET STARTED FREE →
              </button>
            </div>

            {/* Lite */}
            <div className="rounded-2xl border p-7 sm:p-8 relative" style={{ borderColor: `${RED}44`, background: "linear-gradient(135deg, #1a0d0a 0%, #0f1118 100%)" }}>
              <div className="absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-sm text-white tracking-wider" style={{ backgroundColor: RED }}>
                MOST POPULAR
              </div>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">Lite</p>
              <p className="text-5xl font-black mb-1">£3.99<span className="text-lg font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-500 mb-8">7-day free trial · cancel anytime</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {[
                  "Unlimited sessions",
                  "Everything in Free",
                  "3 AI assessments per month",
                  "AI coaching — scores, rationale & tips",
                  "Vocal statistics & transcript highlights",
                  "Comparative coaching across sessions",
                  "Curated articles, TED Talks & podcasts",
                  "Advanced analytics & trends",
                  "Post-session email summary with AI insights",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="shrink-0" style={{ color: RED }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={goToLogin} className="w-full py-3.5 text-sm font-bold text-white transition rounded-sm" style={{ backgroundColor: RED }}>
                START 7-DAY FREE TRIAL →
              </button>
              <p className="text-center text-xs text-slate-600 mt-3">No charge until your trial ends</p>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-violet-500/30 bg-[#0f1118] p-7 sm:p-8 relative flex flex-col" style={{ background: "linear-gradient(135deg, #0d0b1a 0%, #0f1118 100%)" }}>
              <div className="absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-sm text-violet-300 tracking-wider border border-violet-500/40 bg-violet-500/10">
                COMING SOON
              </div>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">Pro</p>
              <p className="text-5xl font-black mb-1 text-slate-300">£9.99<span className="text-lg font-normal text-slate-500">/mo</span></p>
              <p className="text-sm text-slate-500 mb-8">Premium plan · launching soon</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                {[
                  "Everything in Lite",
                  "Unlimited AI assessments",
                  "Industry leaderboard access",
                  "Industry normative benchmarking",
                  "Premium curated content library",
                  "BBC Maestro, Harvard & more",
                  "Individualised learning pathways",
                  "Personal development dashboard",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="text-violet-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              {proSubmitted ? (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-violet-300">You&apos;re on the list!</p>
                  <p className="text-xs text-slate-500 mt-1">We&apos;ll email you the moment Pro launches.</p>
                </div>
              ) : (
                <form onSubmit={handleProNotify} className="space-y-2">
                  <input
                    type="email"
                    required
                    placeholder="Your email address"
                    value={proEmail}
                    onChange={(e) => setProEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#1a1f2e] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 transition"
                  />
                  <button
                    type="submit"
                    disabled={proLoading}
                    className="w-full py-3 text-sm font-bold text-white border border-violet-500/40 hover:border-violet-400 hover:bg-violet-500/10 transition rounded-lg disabled:opacity-50"
                  >
                    {proLoading ? "Saving…" : "NOTIFY ME WHEN PRO LAUNCHES →"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-10">
            Planning for a team or organisation?{" "}
            <a href="mailto:info@learnfastapp.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition">
              Get in touch →
            </a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 sm:py-32 px-5 lg:px-12 text-center bg-[#0a0b12] border-t border-white/5">
        <div className="absolute pointer-events-none inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(209,59,26,0.08) 0%, transparent 70%)" }} />
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-5">Get Started Today</p>
        <h2 className="text-3xl sm:text-6xl font-light text-slate-400 leading-tight mb-1">EVERY GREAT PRESENTER</h2>
        <h2 className="text-3xl sm:text-6xl font-black leading-tight mb-10">STARTED SOMEWHERE</h2>
        <button onClick={goToLogin} className="px-10 py-5 text-sm font-bold tracking-wider text-white transition rounded-sm" style={{ backgroundColor: RED }}>
          CREATE YOUR FREE ACCOUNT →
        </button>
        <p className="mt-4 text-xs text-slate-600">2 free sessions · No credit card · Cancel anytime</p>
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
              START FREE NOW
            </button>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Contact</p>
            <a href="mailto:info@learnfastapp.com" className="text-sm text-slate-500 hover:text-white transition">info@learnfastapp.com</a>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Navigation</p>
            <ul className="space-y-2 text-sm text-slate-500">
              {[["#product", "Product"], ["#how-it-works", "How It Works"], ["#pricing", "Pricing"], ["#why", "Why LearnFast"]].map(([href, label]) => (
                <li key={label}><a href={href} className="hover:text-white transition">{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Follow Us</p>
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
          <p>© {new Date().getFullYear()} LearnFast™. AI-Powered Presentation Intelligence.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-slate-400 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-400 transition">Terms &amp; Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
