"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RED = "#d13b1a";

const STEPS = [
  { n: "01", title: "Create a Session", body: "Name your session and get a unique join code and QR code in seconds." },
  { n: "02", title: "Share With Your Audience", body: "Display the QR or share the link — no app download needed for your audience." },
  { n: "03", title: "Collect Live Feedback", body: "Watch scores arrive in real time across all 5 dimensions as your audience responds." },
  { n: "04", title: "Reflect & Improve", body: "Review your radar chart, compare it with your own self-score, and commit to your next area of focus." },
];

const DIMENSIONS = [
  { name: "Clarity", color: "#8b5cf6", desc: "How clearly your message and structure came across to the room." },
  { name: "Engagement", color: "#22d3ee", desc: "How well you held attention and kept the audience invested throughout." },
  { name: "Energy", color: "#f59e0b", desc: "The presence, vocal delivery and energy you brought to the room." },
  { name: "Understanding", color: "#34d399", desc: "How well the audience grasped the core ideas you shared." },
  { name: "Connection", color: "#f472b6", desc: "How personally connected the audience felt to you and your content." },
];

const FEATURES = [
  { icon: "📊", title: "Performance Tracking", body: "Track your delivery, engagement, understanding and more — week to week, session to session — and watch yourself improve over time." },
  { icon: "🎯", title: "Feedback-Specific Development", body: "Based on YOUR scores, LearnFast surfaces the most relevant articles, TED Talks, videos and podcasts — personalised to your exact development areas." },
  { icon: "🔁", title: "Reflective Practice Loop", body: "Self-score alongside your audience, set a focus commitment for your next session, and check in on progress. Continuous improvement, built in." },
  { icon: "📱", title: "Audience Connector", body: "Your audience joins via a QR code or link — no account needed, no app to download. Feedback in seconds from any device." },
];

const PARTNERS = [
  { name: "Harvard Business Review", style: "font-serif font-bold text-white text-sm" },
  { name: "BBC Maestro", style: "font-bold text-white text-sm tracking-wide" },
  { name: "Big Think", style: "font-bold text-orange-400 text-sm" },
  { name: "Fortune", style: "font-serif font-black text-white text-sm" },
  { name: "The New York Times", style: "font-serif text-white text-sm" },
  { name: "Farnam Street", style: "font-bold text-white text-sm tracking-wider" },
];

export default function LandingPage() {
  const router = useRouter();
  const goToLogin = () => router.push("/auth/login");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <a href="#product" className="hover:text-white transition">PRODUCT</a>
          <a href="#how-it-works" className="hover:text-white transition">HOW IT WORKS</a>
          <a href="#pricing" className="hover:text-white transition">PRICING</a>
          <a href="#why" className="hover:text-white transition">WHY</a>
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

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(109,40,217,0.22) 0%, transparent 60%)" }} />

        <p className="relative text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase mb-5">
          Presentation Feedback Technology
        </p>
        <h1 className="relative text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-tight tracking-tight text-slate-400 mb-1">
          INTRODUCING
        </h1>
        <h1 className="relative text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight mb-6">
          THE LEARNFAST APP
        </h1>
        <p className="relative max-w-xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed mb-3">
          Unlock the Power of Real-Time Feedback for Leaders, Managers and Coaches
        </p>
        <p className="relative text-sm text-slate-500 mb-10">No download required — works on any device, in your browser.</p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition w-full sm:w-auto" style={{ backgroundColor: RED }}>
            START FREE — 2 SESSIONS ON US
          </button>
          <button onClick={goToLogin} className="px-8 py-4 text-sm font-semibold text-slate-300 border border-white/20 hover:border-white/40 hover:text-white transition rounded-sm w-full sm:w-auto">
            SIGN IN →
          </button>
        </div>

        {/* Assets — phone | laptop | phone, mirroring original site's 3-device layout */}
        <div className="relative mx-auto w-full max-w-6xl flex items-end justify-center gap-0">
          {/* Glow beneath */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-48 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(109,40,217,0.28) 0%, transparent 70%)" }} />

          {/* Phone left — performance over time */}
          <div className="hidden md:block relative w-44 lg:w-56 shrink-0 translate-x-8 lg:translate-x-12 z-10" style={{ marginBottom: "-2px" }}>
            <Image
              src="/phone-preview-2.png"
              alt="LearnFast — performance over time"
              width={400}
              height={600}
              className="w-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Laptop — centre, largest */}
          <div className="relative w-full max-w-3xl shrink z-20">
            <Image
              src="/app-preview.png"
              alt="LearnFast app — live session results"
              width={1200}
              height={750}
              className="w-full object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Phone right — live radar */}
          <div className="hidden md:block relative w-44 lg:w-56 shrink-0 -translate-x-8 lg:-translate-x-12 z-10" style={{ marginBottom: "-2px" }}>
            <Image
              src="/phone-preview.png"
              alt="LearnFast — live audience scores"
              width={400}
              height={600}
              className="w-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── TAGLINE BAR ── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-4 px-5 text-center">
        <p className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase">
          Your ideas are only as good as how they are presented
        </p>
      </div>

      {/* ── WHAT WE DO ── */}
      <section id="product" className="py-20 sm:py-28 px-5 lg:px-12 max-w-4xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4">Performance Insights</p>
        <h2 className="text-4xl sm:text-6xl font-light text-slate-400 leading-none mb-1">WHAT</h2>
        <h2 className="text-4xl sm:text-6xl font-black leading-none mb-8">WE DO</h2>
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
          LearnFast connects you with your audience and allows them to give you honest, real-time feedback on your presentation. Our platform automatically surfaces the most relevant expert learning resources based on your scores — helping you upskill quickly and efficiently.
        </p>
        <button onClick={goToLogin} className="px-8 py-4 text-sm font-bold tracking-wider text-white rounded-sm transition" style={{ backgroundColor: RED }}>
          START FREE NOW
        </button>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-[#0f1118] p-6 sm:p-8">
              <p className="text-3xl mb-4">{f.icon}</p>
              <p className="font-bold text-sm uppercase tracking-wider mb-3">{f.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — visual onboarding ── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Simple by Design</p>
          <h2 className="text-4xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">HOW IT</h2>
          <h2 className="text-4xl sm:text-6xl font-black text-center leading-none mb-16">WORKS</h2>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

            {/* Step 1 — Create session */}
            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">01</p>
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-2.jpg" alt="Create a session" width={400} height={711} className="w-full h-full object-cover object-center" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Create a Session</p>
              <p className="text-sm text-slate-400 leading-relaxed">Name your session and get a unique code in seconds.</p>
            </div>

            {/* Step 2 — Share QR */}
            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">02</p>
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-1.jpg" alt="Share with your audience" width={400} height={711} className="w-full h-full object-cover object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Share With Your Audience</p>
              <p className="text-sm text-slate-400 leading-relaxed">Display the QR code or share the link — no app download needed.</p>
            </div>

            {/* Step 3 — Live feedback */}
            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">03</p>
              <div className="w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-3.jpg" alt="Collect live feedback" width={400} height={711} className="w-full h-full object-cover object-bottom sm:object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Collect Live Feedback</p>
              <p className="text-sm text-slate-400 leading-relaxed">Watch scores arrive in real time across all 5 dimensions.</p>
            </div>

            {/* Step 4 — Get Up-Skilled */}
            <div className="flex flex-col items-center text-center">
              <p className="text-6xl font-black text-white/20 leading-none mb-4">04</p>
              <div className="w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-[#0f1118] mb-5" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
                <Image src="/onboard-4.jpg" alt="Get up-skilled" width={400} height={711} className="w-full h-full object-cover object-top" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2">Get Up-Skilled</p>
              <p className="text-sm text-slate-400 leading-relaxed">LearnFast surfaces videos, TED talks and articles matched to your lowest scores.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5 DIMENSIONS ── */}
      <section className="py-16 sm:py-24 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Scored Across</p>
          <h2 className="text-3xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">THE</h2>
          <h2 className="text-3xl sm:text-6xl font-black text-center leading-none mb-6">5 DIMENSIONS</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
            Every session gives you a complete picture of your performance across five areas that matter most.
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
                Audience scores + your own self-reflection = a complete, honest performance picture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY / GET STARTED ── */}
      <section id="why" className="py-20 sm:py-28 px-5 lg:px-12 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4">Made for Leaders</p>
        <h2 className="text-4xl sm:text-6xl font-light text-slate-400 leading-none mb-1">GET STARTED WITH</h2>
        <h2 className="text-4xl sm:text-6xl font-black leading-none mb-8">LEARNFAST TODAY</h2>
        <p className="max-w-xl mx-auto text-slate-400 leading-relaxed mb-10 text-sm sm:text-base">
          Whether you're a corporate trainer, team leader or university lecturer — every great presenter started somewhere. LearnFast gives you the data, the reflection and the resources to improve with every session.
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
      <section className="py-16 px-5 lg:px-12 bg-[#0a0b12] border-y border-white/5">
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
                style={{
                  backgroundColor: RED,
                  clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
                }}
              >
                <p>COMING</p>
                <p>SOON</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-10">Learn and upskill with the best in their field.</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {PARTNERS.map((p) => (
              <span key={p.name} className={`${p.style} opacity-70 hover:opacity-100 transition`}>{p.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 px-5 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Pricing</p>
          <h2 className="text-4xl sm:text-6xl font-light text-slate-400 text-center leading-none mb-1">START FREE,</h2>
          <h2 className="text-4xl sm:text-6xl font-black text-center leading-none mb-16">SCALE WHEN READY</h2>
          <div className="flex justify-center">

            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-7 sm:p-8 w-full max-w-sm">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-5">Free</p>
              <p className="text-5xl font-black mb-1">£0</p>
              <p className="text-sm text-slate-500 mb-8">No credit card required</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {[
                  "2 feedback sessions",
                  "All 5 scoring dimensions",
                  "Real-time audience radar chart",
                  "Presenter self-reflection scores",
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
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 sm:py-32 px-5 lg:px-12 text-center bg-[#0a0b12] border-t border-white/5">
        <div className="absolute pointer-events-none inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(209,59,26,0.08) 0%, transparent 70%)" }} />
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-5">Get Started Today</p>
        <h2 className="text-4xl sm:text-6xl font-light text-slate-400 leading-tight mb-1">EVERY GREAT PRESENTER</h2>
        <h2 className="text-4xl sm:text-6xl font-black leading-tight mb-10">STARTED SOMEWHERE</h2>
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
              {[
                { label: "Instagram", icon: "IG" },
                { label: "X", icon: "𝕏" },
                { label: "LinkedIn", icon: "in" },
              ].map((s) => (
                <div key={s.label} className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold text-slate-400 hover:border-white/60 hover:text-white transition cursor-pointer">
                  {s.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} LearnFast™. Feedback Intelligence.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-slate-400 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-400 transition">Terms &amp; Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
