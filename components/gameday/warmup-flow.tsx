"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import CueCardView from "./cue-card-view";
import ManualCueCardForm from "./manual-cue-card-form";

type Step = "breathing" | "first-line" | "cuecard" | "done";

interface Props {
  planId: string;
  cardId: string | null;
  cachedLines: string[] | null;
  isTaper: boolean;
  /** Text shown above the manual-entry form when no card exists yet — framed
   * differently depending on why (extraction failed vs. no plan was ever
   * generated for the <4h "immediate" path). */
  manualEntrySubheading: string;
  /** Persists manually-typed lines. Omit for the <4h "immediate" path, which
   * has no plan doc to attach a cue card to — falls back to local-only. */
  onManualSave?: (lines: string[]) => Promise<{ cardId: string } | void>;
  /** Skips straight to the cue card, bypassing the breathing/first-line
   * ritual — for a "come check what I just built" visit right after
   * rehearsing, not the actual event-day sequence. Defaults to "breathing". */
  initialStep?: Step;
  /** Where the terminal "done" screen's link goes — there's no universal
   * "back" from here, so each entry point supplies its own destination
   * (the plan page for a real event, the dashboard for the <4h path, which
   * has no plan to return to) and label. */
  doneHref: string;
  doneLabel: string;
}

const BREATHING_SECONDS = 60;

/**
 * The 90-Second Warm-Up (spec §5), event day: no camera, no score. Sequence:
 * paced breathing -> first-line rehearsal prompt -> cue card display ->
 * "Go get it." Entirely offline-safe — `cachedLines`/`cardId` are read from
 * localStorage by the page before this even mounts, so the whole flow works
 * with no network (the exact scenario this screen exists for: a corridor or
 * venue basement with terrible signal).
 */
export default function WarmupFlow({
  planId,
  cardId: initialCardId,
  cachedLines: initialCachedLines,
  isTaper,
  manualEntrySubheading,
  onManualSave,
  initialStep,
  doneHref,
  doneLabel,
}: Props) {
  const t = useTranslations("gameday");
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep ?? "breathing");
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_SECONDS);
  const [goingLive, setGoingLive] = useState(false);
  // A deep-linked "come check what I built" visit skips breathing/first-line
  // entirely — so it must NOT end in the same "Go get it" button that fires a
  // real live audience session. Without the ritual in between, that hand-off
  // has nothing to hand off FROM; it would just fire a real session out of
  // nowhere the moment someone previews their card mid-rehearsal.
  const isPreview = initialStep === "cuecard";

  // `initialStep` comes from the parent's `useSearchParams()`, which — since
  // it lives inside the Suspense boundary Next.js requires for that hook —
  // isn't guaranteed to reflect the URL's `?step=` on this component's very
  // first mount. `useState(initialStep ?? "breathing")` above only consults
  // its argument once, at that first mount, so if the prop arrives a beat
  // late the deep link would silently be ignored and the ritual would start
  // from breathing regardless. Catch up here as soon as the real value shows
  // up, once — this never fires again after the user has moved past step 1
  // themselves, since by then `initialStep` itself isn't changing anymore.
  useEffect(() => {
    (() => {
      if (initialStep === "cuecard") setStep("cuecard");
    })();
  }, [initialStep]);
  // Not mirrored into useState — `initialCardId`/`initialCachedLines` start
  // null (the parent page resolves them asynchronously, after this mounts,
  // to avoid a hydration mismatch) and a plain `useState(initialCardId)`
  // would only ever capture that first null, permanently, never seeing the
  // parent's later update. Derive on every render instead; a manual save
  // overrides until the next real props arrive.
  const [manualOverride, setManualOverride] = useState<{ cardId: string; lines: string[] } | null>(null);
  const cardId = manualOverride?.cardId ?? initialCardId;
  const cachedLines = manualOverride?.lines ?? initialCachedLines;

  async function handleManualSubmit(lines: string[]) {
    const result = onManualSave ? await onManualSave(lines) : undefined;
    setManualOverride({ cardId: result?.cardId ?? "local", lines });
  }

  // "Go get it." is the hand-off from prep into the actual event — it starts
  // the exact same live audience-feedback session the rest of the app already
  // has (POST /api/sessions/create, the presenter's live view at
  // /sessions/{id} with its QR code + real-time three-signal radar). Nothing
  // about that system changes; this is just a new place that triggers it.
  async function handleGoGetIt() {
    if (!user || goingLive) return;
    setGoingLive(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Gameday", tags: ["gameday"] }),
      });
      if (!res.ok) {
        setGoingLive(false);
        setStep("done");
        return;
      }
      const data = await res.json();
      router.push(`/sessions/${data.sessionId}`);
    } catch {
      setGoingLive(false);
      setStep("done");
    }
  }

  useEffect(() => {
    if (step !== "breathing") return;
    // The transition out of "breathing" is deferred into the same tick
    // boundary as the countdown itself, not called synchronously in the
    // effect body.
    const timer = setTimeout(() => {
      if (secondsLeft <= 1) {
        setStep("first-line");
      } else {
        setSecondsLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, secondsLeft]);

  // Event day is the one place that deliberately breaks from violet — violet
  // reads as "practice mode" everywhere else in the app, and this isn't
  // practice. Warm-toned, full-bleed, no card chrome.
  if (step === "breathing") {
    return (
      <div className="warmup-bg min-h-screen text-white flex flex-col items-center justify-center p-6">
        <div className="relative w-40 h-40 rounded-full border-2 border-amber-500/40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
          <span key={secondsLeft} className="breathe-tick relative text-4xl font-mono font-bold">{secondsLeft}</span>
        </div>
        <p className="mt-8 text-slate-300 text-center max-w-xs">{t.warmupBreathingPrompt}</p>
        <button type="button" onClick={() => setStep("first-line")} className="mt-6 text-sm text-slate-500 hover:text-white">
          {t.skipBtn}
        </button>
      </div>
    );
  }

  if (step === "first-line") {
    return (
      <div className="warmup-bg min-h-screen text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-300 mb-3">{t.warmupFirstLinePrompt}</p>
        {cachedLines && <p className="text-2xl font-bold mb-8 max-w-sm">{cachedLines[0]}</p>}
        <button
          type="button"
          onClick={() => setStep("cuecard")}
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-400 transition"
        >
          {t.continueBtn}
        </button>
      </div>
    );
  }

  if (step === "cuecard") {
    return (
      <div className="warmup-bg min-h-screen text-white relative">
        {cardId && cachedLines ? (
          <CueCardView
            // Force a fresh mount whenever the card itself changes (a
            // regeneration) — CueCardView's local `lines`/`drafts` state is
            // seeded once from `initialLines`; without this key it would
            // keep showing whatever it first mounted with even after a
            // brand-new card's props arrive.
            key={cardId}
            planId={planId}
            cardId={cardId}
            initialLines={cachedLines}
            isTaper={isTaper}
          />
        ) : (
          <ManualCueCardForm subheading={manualEntrySubheading} onSubmit={handleManualSubmit} />
        )}
        <div className="fixed bottom-6 inset-x-0 flex justify-center">
          {isPreview ? (
            <a
              href={doneHref}
              className="rounded-xl border border-white/15 bg-[#0a0f1e]/90 backdrop-blur px-8 py-3 text-sm font-semibold text-white hover:bg-white/5 shadow-lg transition"
            >
              {doneLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={handleGoGetIt}
              disabled={goingLive}
              className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-semibold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-60"
            >
              {goingLive ? t.startingLiveSession : t.goGetItBtn}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Only reached if starting the live session failed — the happy path
  // navigates straight to /sessions/{id} and never renders this.
  return (
    <div className="warmup-bg min-h-screen text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-xl font-bold">{t.goLiveFailedMessage}</p>
      <a href={doneHref} className="text-sm font-medium text-amber-300 hover:text-amber-200 transition">
        {doneLabel} →
      </a>
    </div>
  );
}
