"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Clock, Globe, Link as LinkIcon, Calendar, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import {
  trackCoachProfileViewed,
  trackCoachBookingStarted,
  trackCoachBookingRequested,
} from "@/lib/coach-analytics";

interface CoachPublic {
  id: string;
  slug: string;
  name: string;
  headshotUrl: string;
  quote: string;
  bioShort: string;
  bioLong: string;
  specialties: string[];
  credentials: string;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  timezone: string;
  callDurationMins: number;
  learnfastScore: number | null;
  archetype: string | null;
  introVideoId: string | null;
  listingTier: string;
  featured: boolean;
}

// Minimal slot picker — three 30-min aligned half-hour blocks the user selects
function SlotPicker({
  callDurationMins,
  onSlots,
}: {
  callDurationMins: number;
  onSlots: (slots: { start: string; end: string }[]) => void;
}) {
  const [dates, setDates] = useState<{ date: string; time: string }[]>([
    { date: "", time: "" },
    { date: "", time: "" },
    { date: "", time: "" },
  ]);

  const update = (idx: number, field: "date" | "time", val: string) => {
    const next = [...dates];
    next[idx] = { ...next[idx], [field]: val };
    setDates(next);

    const slots = next
      .filter((d) => d.date && d.time)
      .map((d) => {
        const start = new Date(`${d.date}T${d.time}`);
        const end = new Date(start.getTime() + callDurationMins * 60 * 1000);
        return { start: start.toISOString(), end: end.toISOString() };
      });
    onSlots(slots);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minStr = minDate.toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs">Propose up to 3 times (your local time). The coach will confirm one.</p>
      {dates.map((d, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-slate-500 text-xs pt-2.5 w-4 shrink-0">{i + 1}</span>
          <input
            type="date"
            min={minStr}
            value={d.date}
            onChange={(e) => update(i, "date", e.target.value)}
            className="flex-1 bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
          />
          <input
            type="time"
            step="1800"
            value={d.time}
            onChange={(e) => update(i, "time", e.target.value)}
            className="w-28 bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
          />
        </div>
      ))}
    </div>
  );
}

export default function CoachProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [coach, setCoach] = useState<CoachPublic | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);

  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/coaches/${slug}`)
      .then((r) => r.json())
      .then((d: { coach?: CoachPublic; error?: string }) => {
        if (d.coach) {
          setCoach(d.coach);
          trackCoachProfileViewed(slug);
        } else {
          router.replace("/coaches");
        }
      })
      .catch(() => router.replace("/coaches"))
      .finally(() => setLoadingCoach(false));
  }, [slug, router]);

  async function handleBook() {
    if (!user) {
      trackCoachBookingStarted(slug);
      router.push(`/auth?redirect=/coaches/${slug}`);
      return;
    }
    if (slots.length < 1) {
      setSubmitError("Please propose at least one time slot.");
      return;
    }
    trackCoachBookingStarted(slug);
    setSubmitError("");
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/coaches/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ coachSlug: slug, slots, userNote: note }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        const msgs: Record<string, string> = {
          too_many_open_requests: "You already have 3 open discovery call requests. Complete or cancel one first.",
          already_requested_this_coach: "You already have a pending request with this coach.",
          coach_not_found: "This coach is no longer available.",
        };
        setSubmitError(msgs[data.error ?? ""] ?? "Something went wrong — please try again.");
      } else {
        trackCoachBookingRequested(slug);
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCoach) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!coach) return null;

  const bioPreview = coach.bioLong.split(" ").slice(0, 60).join(" ");
  const showToggle = coach.bioLong.split(" ").length > 60;

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      {/* Nav */}
      <div className="border-b border-[#1e293b]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/coaches" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> All coaches
          </Link>
          <Link href="/" className="flex items-center gap-2">
              <Image src="/icon-mark.png" alt="LearnFast" width={28} height={20} />
              <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>LEARN<span className="font-light">FAST</span></span>
            </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
          {/* Left — profile */}
          <div>
            {/* Hero */}
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shrink-0 bg-[#0f172a]">
                <Image
                  src={coach.headshotUrl}
                  alt={coach.name}
                  fill
                  sizes="160px"
                  className="object-cover object-top"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{coach.name}</h1>
                {coach.archetype && (
                  <p className="text-violet-400 text-sm font-medium mb-2">{coach.archetype}</p>
                )}
                <p className="text-slate-400 text-sm leading-relaxed mb-3 italic">
                  &ldquo;{coach.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {coach.linkedinUrl && (
                    <a
                      href={coach.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  )}
                  {coach.websiteUrl && (
                    <a
                      href={coach.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {coach.callDurationMins} min discovery call
                  </span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-2 mb-8">
              {coach.specialties.map((s) => (
                <span key={s} className="text-sm text-slate-300 bg-[#1e293b] border border-[#334155] rounded-full px-3 py-1">
                  {s}
                </span>
              ))}
            </div>

            {/* LearnFast score */}
            {coach.learnfastScore !== null && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 mb-6">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">LearnFast Score</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-white">{coach.learnfastScore}</span>
                  <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full"
                      style={{ width: `${coach.learnfastScore}%` }}
                    />
                  </div>
                </div>
                <p className="text-slate-500 text-xs mt-2">Verified LearnFast rehearsal score across 5 communication dimensions</p>
              </div>
            )}

            {/* Credentials */}
            <div className="mb-8">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Credentials</p>
              <p className="text-slate-300 text-sm leading-relaxed">{coach.credentials}</p>
            </div>

            {/* Bio */}
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">About</p>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {bioExpanded || !showToggle ? coach.bioLong : `${bioPreview}…`}
              </div>
              {showToggle && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="mt-2 inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm transition-colors"
                >
                  {bioExpanded ? (
                    <><ChevronUp className="w-4 h-4" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Read more</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right — booking panel */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              {submitted ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-white font-semibold text-lg mb-2">Request sent!</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    {coach.name} will respond within 48 hours. You&apos;ll get an email with a calendar invite once they confirm.
                  </p>
                  <Link
                    href="/dashboard/coaching"
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Calendar className="w-4 h-4" /> View my calls
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="text-white font-semibold text-lg mb-1">Book a discovery call</h3>
                  <p className="text-slate-500 text-sm mb-6">Free · {coach.callDurationMins} minutes · No commitment</p>

                  <div className="space-y-5">
                    <SlotPicker callDurationMins={coach.callDurationMins} onSlots={setSlots} />

                    <div>
                      <label className="block text-slate-400 text-xs mb-1.5">
                        What would you like to work on? <span className="text-slate-600">(optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. I have a board presentation in 6 weeks and struggle with nerves…"
                        className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
                      />
                    </div>

                    {submitError && (
                      <p className="text-red-400 text-sm">{submitError}</p>
                    )}

                    {!authLoading && !user && (
                      <p className="text-slate-500 text-xs">
                        You&apos;ll be asked to sign in before sending your request.
                      </p>
                    )}

                    <button
                      onClick={handleBook}
                      disabled={submitting}
                      className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      ) : (
                        <><Calendar className="w-4 h-4" /> Request discovery call</>
                      )}
                    </button>

                    <p className="text-slate-600 text-xs text-center">
                      Your email is shared with {coach.name} only after they confirm.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
