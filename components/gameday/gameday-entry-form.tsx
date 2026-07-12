"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/i18n";
import { getEnabledContexts, getLocalizedContextLabel } from "@/lib/contexts/registry";
import { classifyRunway } from "@/lib/gameday/runway";

const CONTEXTS = getEnabledContexts();
const DEFAULT_SESSIONS_PER_WEEK = 3;

export default function GamedayEntryForm() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("gameday");

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [contextType, setContextType] = useState("general");
  const [showAdjust, setShowAdjust] = useState(false);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(DEFAULT_SESSIONS_PER_WEEK);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Instant client-side classification so the mode banner / fast-path note
  // reacts immediately, before the round trip to the server (which re-validates
  // independently).
  const preview = useMemo(() => {
    if (!eventDate) return null;
    const parsed = new Date(eventDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return classifyRunway(parsed, new Date());
  }, [eventDate]);

  async function handleSubmit() {
    if (!user || !title.trim() || !eventDate) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/gameday/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          eventDate: new Date(eventDate).toISOString(),
          contextType,
          sessionsPerWeek: showAdjust ? sessionsPerWeek : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error === "invalid_date" ? t.errInvalidDate : t.errGeneric);
        setSubmitting(false);
        return;
      }

      if (data.mode === "immediate") {
        // Phase D builds the actual cue-card quick-entry + Warm-Up flow.
        router.push("/gameday/warmup-now");
        return;
      }

      router.push(`/gameday/${data.eventId}`);
    } catch {
      setErrorMsg(t.errNetwork);
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && title.trim().length > 0 && eventDate.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-white/10 bg-[#111827] p-8">
      <h1 className="text-xl font-bold text-white">{t.entryHeading}</h1>
      <p className="text-sm text-slate-400 mt-0.5 mb-6">{t.entrySubheading}</p>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">{t.eventNameLabel}</label>
          <input
            type="text"
            placeholder={t.eventNamePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">{t.eventDateLabel}</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
          <p className="mt-1.5 text-xs text-slate-500">{t.eventDateHelper}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">{t.contextLabel}</label>
          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white text-sm outline-none focus:border-violet-500 appearance-none"
          >
            {CONTEXTS.map((c) => (
              <option key={c.contextId} value={c.contextId}>
                {getLocalizedContextLabel(c.contextId, locale)}
              </option>
            ))}
          </select>
        </div>

        {preview && preview.mode === "sprint" && (
          <p className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 text-sm text-violet-300">
            {t.sprintModeBanner(preview.runwayDays)}
          </p>
        )}
        {preview && preview.mode === "immediate" && (
          <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-300">
            {t.immediateRedirectNote}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowAdjust((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
          >
            {showAdjust ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {t.adjustSettingsToggle}
          </button>
          {showAdjust && (
            <div className="mt-3">
              <label className="mb-1.5 block text-sm text-slate-400">{t.sessionsPerWeekLabel}</label>
              <input
                type="number"
                min={2}
                max={5}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                className="w-24 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-2 text-white outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>

        {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? t.generating : t.generatePlanBtn}
        </button>
      </div>
    </div>
  );
}
