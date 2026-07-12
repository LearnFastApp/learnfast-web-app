"use client";

import { Mic, StickyNote, Target, ChevronRight } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

/**
 * A separate, purely informational box above the entry form — "what is
 * this and how does it work" for someone who's never used Gameday before,
 * kept short since the full 5-stage detail already lives in the roadmap
 * shown once a plan actually exists.
 */
export default function GamedayIntro() {
  const t = useTranslations("gameday");

  const steps = [
    { icon: Mic, label: t.introStepPracticeLabel },
    { icon: StickyNote, label: t.introStepCueCardLabel },
    { icon: Target, label: t.introStepEventDayLabel },
  ];

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{t.introEyebrow}</p>
      <h2 className="text-lg font-bold text-white mt-1">{t.introHeading}</h2>
      <p className="text-sm text-slate-300 mt-2 leading-relaxed">{t.introBody}</p>

      <div className="mt-6 flex items-center justify-center">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5 text-center w-20">
              <div className="h-9 w-9 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <step.icon className="h-4 w-4 text-violet-300" />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{step.label}</p>
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0 mb-5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
