"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import CueCardView from "./cue-card-view";

type Step = "breathing" | "first-line" | "cuecard" | "done";

interface Props {
  planId: string;
  cardId: string | null;
  cachedLines: string[] | null;
  isTaper: boolean;
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
export default function WarmupFlow({ planId, cardId, cachedLines, isTaper }: Props) {
  const t = useTranslations("gameday");
  const [step, setStep] = useState<Step>("breathing");
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_SECONDS);

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

  if (step === "breathing") {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-center p-6">
        <div className="relative w-40 h-40 rounded-full border-2 border-violet-500/40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" />
          <span className="relative text-4xl font-mono font-bold">{secondsLeft}</span>
        </div>
        <p className="mt-8 text-slate-400 text-center max-w-xs">{t.warmupBreathingPrompt}</p>
        <button type="button" onClick={() => setStep("first-line")} className="mt-6 text-sm text-slate-500 hover:text-white">
          {t.skipBtn}
        </button>
      </div>
    );
  }

  if (step === "first-line") {
    return (
      <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-400 mb-3">{t.warmupFirstLinePrompt}</p>
        {cachedLines && <p className="text-2xl font-bold mb-8 max-w-sm">{cachedLines[0]}</p>}
        <button
          type="button"
          onClick={() => setStep("cuecard")}
          className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition"
        >
          {t.continueBtn}
        </button>
      </div>
    );
  }

  if (step === "cuecard") {
    return (
      <div className="min-h-screen bg-[#05070d] text-white relative">
        {cardId && cachedLines ? (
          <CueCardView planId={planId} cardId={cardId} initialLines={cachedLines} isTaper={isTaper} />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-slate-500">{t.manualCueCardHeading}</p>
          </div>
        )}
        <div className="fixed bottom-6 inset-x-0 flex justify-center">
          <button
            type="button"
            onClick={() => setStep("done")}
            className="rounded-xl bg-violet-500 px-8 py-3 text-sm font-semibold text-white hover:bg-violet-600 shadow-lg shadow-violet-500/20 transition"
          >
            {t.goGetItBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center p-6 text-center">
      <p className="text-xl font-bold">{t.workIsDoneMessage}</p>
    </div>
  );
}
