"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { trackCoachApplicationSubmitted } from "@/lib/coach-analytics";

const SPECIALTIES = [
  "Executive presence",
  "Storytelling",
  "Pitch coaching",
  "Leadership communication",
  "Confidence",
  "Public speaking",
  "Data storytelling",
  "Negotiation",
];

const TIMEZONES = [
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Madrid",
  "Europe/Rome",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

export default function CoachApplyPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    linkedinUrl: "",
    websiteUrl: "",
    credentials: "",
    timezone: "Europe/London",
    specialties: [] as string[],
    quote: "",
    bioShort: "",
    bioLong: "",
    tryCompleted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function toggleSpecialty(s: string) {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.credentials.trim() || !form.bioShort.trim() || !form.bioLong.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.specialties.length === 0) {
      setError("Please select at least one specialty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/coaches/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          specialties: form.specialties.join(", "),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        const msgs: Record<string, string> = {
          already_applied: "We already have an application from this email address.",
          invalid_email: "Please enter a valid email address.",
          missing_required_fields: "Please fill in all required fields.",
        };
        setError(msgs[data.error ?? ""] ?? "Something went wrong — please try again.");
      } else {
        trackCoachApplicationSubmitted();
        setSubmitted(true);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-3">Application received</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Thanks {form.name.split(" ")[0]}! We review applications on a rolling basis and will be in touch within 2 weeks if we think you&apos;re a great fit.
          </p>
          <Link href="/coaches" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to roster
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <div className="border-b border-[#1e293b]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/coaches" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Coach roster
          </Link>
          <Link href="/" className="flex items-center gap-2">
              <Image src="/icon-mark.png" alt="LearnFast" width={28} height={20} />
              <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>LEARN<span className="font-light">FAST</span></span>
            </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Apply to join the coach roster</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We&apos;re building a curated roster of exceptional communication coaches. We look for deep expertise, a strong track record, and a genuine commitment to helping leaders communicate with impact.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Section 1: About you ── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">About you</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name <span className="text-red-400">*</span></label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address <span className="text-red-400">*</span></label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">LinkedIn profile URL</label>
                <input
                  type="url" value={form.linkedinUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Website URL</label>
                <input
                  type="url" value={form.websiteUrl}
                  onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Your timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Section 2: Expertise ── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your expertise</p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Credentials & qualifications <span className="text-red-400">*</span>
              </label>
              <input
                type="text" required value={form.credentials}
                onChange={(e) => setForm((f) => ({ ...f, credentials: e.target.value }))}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                placeholder="ICF PCC, 15 yrs C-suite coaching"
              />
              <p className="text-xs text-slate-600 mt-1">Shown on your public profile card.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Areas of specialty <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => {
                  const selected = form.specialties.includes(s);
                  return (
                    <button
                      key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-violet-600 border-violet-500 text-white"
                          : "bg-[#0f172a] border-[#1e293b] text-slate-400 hover:border-violet-500/40"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 3: Your profile ── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your profile</p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Pull quote <span className="text-slate-500 font-normal">(optional, max 140 chars)</span>
              </label>
              <input
                type="text" maxLength={140} value={form.quote}
                onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                placeholder="&ldquo;Great communication isn't born — it's built.&rdquo;"
              />
              <p className="text-xs text-slate-600 mt-1 text-right">{form.quote.length} / 140</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Short bio <span className="text-red-400">*</span>{" "}
                <span className="text-slate-500 font-normal">(max 280 chars — shown on your roster card)</span>
              </label>
              <textarea
                rows={3} required maxLength={280} value={form.bioShort}
                onChange={(e) => setForm((f) => ({ ...f, bioShort: e.target.value }))}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
                placeholder="A punchy summary of who you coach and what makes your approach distinctive."
              />
              <p className="text-xs text-slate-600 mt-1 text-right">{form.bioShort.length} / 280</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Full bio <span className="text-red-400">*</span>{" "}
                <span className="text-slate-500 font-normal">(shown on your full profile page)</span>
              </label>
              <textarea
                rows={7} required maxLength={3000} value={form.bioLong}
                onChange={(e) => setForm((f) => ({ ...f, bioLong: e.target.value }))}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
                placeholder="Your background, methodology, notable client results, and what excites you about working with LearnFast clients…"
              />
              <p className="text-xs text-slate-600 mt-1 text-right">{form.bioLong.length} / 3000</p>
            </div>
          </div>

          {/* ── LearnFast experience ── */}
          <div className="flex items-start gap-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
            <input
              type="checkbox" id="tryCompleted" checked={form.tryCompleted}
              onChange={(e) => setForm((f) => ({ ...f, tryCompleted: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-violet-600 cursor-pointer"
            />
            <label htmlFor="tryCompleted" className="text-sm text-slate-300 cursor-pointer">
              I&apos;ve completed a LearnFast rehearsal (create one from your{" "}
              <Link href="/dashboard" className="text-violet-400 hover:text-violet-300">dashboard</Link>)
            </label>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            ) : "Submit application"}
          </button>

          <p className="text-slate-600 text-xs text-center">
            We review applications on a rolling basis. We&apos;ll reply within 2 weeks.
          </p>
        </form>
      </div>
    </div>
  );
}
