"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const DIMENSIONS = [
  { name: "Clarity", color: "#8b5cf6", desc: "How clearly your message and structure came across." },
  { name: "Engagement", color: "#22d3ee", desc: "How well you held attention and kept the room invested." },
  { name: "Energy", color: "#f59e0b", desc: "The presence, vocal delivery and energy you brought." },
  { name: "Understanding", color: "#34d399", desc: "How well the audience grasped your core ideas." },
  { name: "Connection", color: "#f472b6", desc: "How personally connected the audience felt to you." },
];

const STEPS = [
  { number: "01", title: "Create a Session", desc: "Name your session and get a unique code and QR in seconds." },
  { number: "02", title: "Share With Your Audience", desc: "Display the QR or share the link — no app download needed for your audience." },
  { number: "03", title: "Collect Real-Time Feedback", desc: "Watch scores come in live across all 5 dimensions as your audience responds." },
  { number: "04", title: "Reflect and Improve", desc: "Review your radar chart, compare with your own self-scores, and commit to your next focus area." },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#07080f] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 bg-[#07080f]/90 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image src="/icon-mark.png" alt="LearnFast" width={36} height={26} />
          <span className="text-lg font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#product" className="hover:text-white transition">PRODUCT</a>
          <a href="#how-it-works" className="hover:text-white transition">HOW IT WORKS</a>
          <a href="#pricing" className="hover:text-white transition">PRICING</a>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/auth/login")}
            className="hidden sm:block text-sm text-slate-400 hover:text-white transition px-4 py-2"
          >
            Sign in
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-sm text-white transition whitespace-nowrap"
            style={{ backgroundColor: "#d13b1a" }}
          >
            START FREE →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-40 pb-28 px-6 lg:px-12">
        <div className="absolute inset-0 bg-gradient-radial from-violet-900/20 via-transparent to-transparent pointer-events-none" />

        <p className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase mb-6">
          Presentation Feedback Technology
        </p>
        <h1 className="text-4xl md:text-7xl lg:text-8xl font-light leading-tight tracking-tight mb-2 text-slate-300">
          REAL-TIME FEEDBACK
        </h1>
        <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight mb-8">
          FOR EVERY PRESENTER
        </h1>
        <p className="max-w-xl text-lg text-slate-400 leading-relaxed mb-10">
          Unlock the power of honest audience feedback. Track your impact across 5 dimensions, reflect on your performance, and improve with every session.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => router.push("/auth/login")}
            className="px-8 py-4 text-sm font-bold tracking-wider text-white transition rounded-sm"
            style={{ backgroundColor: "#d13b1a" }}
          >
            START FREE — 5 SESSIONS ON US
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-8 py-4 text-sm font-semibold text-slate-300 border border-white/20 hover:border-white/40 hover:text-white transition rounded-sm"
          >
            SIGN IN →
          </button>
        </div>

        {/* Radar mockup */}
        <div className="mt-20 w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#0f1424] p-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-6 text-center">Live session · 24 responses</p>
          <div className="grid grid-cols-5 gap-3 mb-8">
            {DIMENSIONS.map((d) => (
              <div key={d.name} className="text-center">
                <p className="text-xs text-slate-500 mb-2">{d.name}</p>
                <p className="text-2xl font-bold" style={{ color: d.color }}>
                  {[78, 65, 82, 71, 59][DIMENSIONS.indexOf(d)]}
                </p>
                <p className="text-xs text-slate-600">/100</p>
              </div>
            ))}
          </div>
          <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-400" />
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">Audience response rate · 24 of 32 participants</p>
        </div>
      </section>

      {/* Tagline banner */}
      <div className="border-y border-white/5 bg-white/[0.02] py-5 px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase">
          Your ideas are only as good as how they are presented
        </p>
      </div>

      {/* Product — 5 dimensions */}
      <section id="product" className="py-24 px-6 lg:px-12 max-w-6xl mx-auto">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Product Overview</p>
        <h2 className="text-4xl md:text-6xl font-light text-center text-slate-300 leading-none mb-2">THE</h2>
        <h2 className="text-4xl md:text-6xl font-bold text-center leading-none mb-6">5 DIMENSIONS</h2>
        <p className="text-center text-slate-400 max-w-lg mx-auto mb-16">
          Every session is scored across five areas that together give a complete picture of your performance.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((d) => (
            <div
              key={d.name}
              className="rounded-xl border border-white/10 bg-[#0f1424] p-6 hover:border-white/20 transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <p className="font-bold tracking-wide text-sm uppercase">{d.name}</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{d.desc}</p>
            </div>
          ))}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 flex items-center justify-center">
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              Audience scores combined with your own self-reflection for a complete performance picture.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 lg:px-12 bg-[#0a0b14] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Simple by Design</p>
          <h2 className="text-4xl md:text-6xl font-light text-center text-slate-300 leading-none mb-2">HOW IT</h2>
          <h2 className="text-4xl md:text-6xl font-bold text-center leading-none mb-16">WORKS</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.number} className="relative">
                <p className="text-5xl font-bold text-white/5 mb-4">{s.number}</p>
                <p className="text-sm font-bold uppercase tracking-wider mb-2">{s.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4">Built For</p>
        <h2 className="text-4xl md:text-6xl font-light text-slate-300 leading-none mb-2">LEADERS,</h2>
        <h2 className="text-4xl md:text-6xl font-bold leading-none mb-16">MANAGERS & COACHES</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Corporate Trainers", desc: "Run post-session feedback that's actionable, not just a form." },
            { label: "Team Leaders", desc: "Understand how your briefings and presentations land with your team." },
            { label: "University Lecturers", desc: "Understand how your lectures land and improve student engagement each term." },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-[#0f1424] p-6">
              <p className="font-bold text-sm uppercase tracking-wider mb-2">{item.label}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 lg:px-12 bg-[#0a0b14] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-4 text-center">Simple Pricing</p>
          <h2 className="text-4xl md:text-6xl font-light text-center text-slate-300 leading-none mb-2">START FREE,</h2>
          <h2 className="text-4xl md:text-6xl font-bold text-center leading-none mb-16">SCALE WHEN READY</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-xl border border-white/10 bg-[#0f1424] p-8">
              <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">Free</p>
              <p className="text-5xl font-bold mb-1">£0</p>
              <p className="text-sm text-slate-500 mb-8">No card required</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {["5 feedback sessions", "All 5 scoring dimensions", "Real-time radar chart", "Session notes", "Reflective practice log"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full py-3 text-sm font-bold border border-white/20 hover:border-white/40 text-white transition rounded-sm"
              >
                GET STARTED FREE →
              </button>
            </div>
            {/* Lite */}
            <div className="rounded-xl border p-8 relative" style={{ borderColor: "#d13b1a33", background: "linear-gradient(135deg, #1a0d0a 0%, #0f1424 100%)" }}>
              <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-sm text-white" style={{ backgroundColor: "#d13b1a" }}>
                LITE VERSION
              </div>
              <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">Lite</p>
              <p className="text-5xl font-bold mb-1">£3.99<span className="text-xl font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-500 mb-8">7-day free trial · cancel anytime</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                {[
                  "Unlimited sessions",
                  "Everything in Free",
                  "Curated improvement resources",
                  "Video, TED Talk & podcast library",
                  "Advanced analytics & trends",
                  "Commitment & check-in tracking",
                  "Session summary emails",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span style={{ color: "#d13b1a" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full py-3 text-sm font-bold text-white transition rounded-sm"
                style={{ backgroundColor: "#d13b1a" }}
              >
                START 7-DAY FREE TRIAL →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 lg:px-12 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-6">Get Started Today</p>
        <h2 className="text-4xl md:text-7xl font-light text-slate-300 leading-tight mb-2">EVERY GREAT PRESENTER</h2>
        <h2 className="text-4xl md:text-7xl font-bold leading-tight mb-10">STARTED SOMEWHERE</h2>
        <button
          onClick={() => router.push("/auth/login")}
          className="px-10 py-5 text-sm font-bold tracking-wider text-white transition rounded-sm"
          style={{ backgroundColor: "#d13b1a" }}
        >
          CREATE YOUR FREE ACCOUNT →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/icon-mark.png" alt="LearnFast" width={28} height={20} />
            <span className="text-sm font-bold" style={{ color: "#5bb8f5" }}>
              LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
            </span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} LearnFast. Feedback Intelligence.</p>
          <div className="flex gap-6 text-xs text-slate-600">
            <a href="/auth/login" className="hover:text-slate-400 transition">Sign in</a>
            <a href="/pricing" className="hover:text-slate-400 transition">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
