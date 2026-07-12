"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

interface Props {
  subheading: string;
  onSubmit: (lines: string[]) => void | Promise<void>;
}

/**
 * Type-it-yourself fallback: shown whenever the Warm-Up screen has no cue
 * card yet — extraction failed, or (the <4h "immediate" path) no fullrun
 * ever happened to extract one from. Same 5-line shape as the AI-extracted
 * card, so CueCardView takes over identically once these lines exist.
 */
export default function ManualCueCardForm({ subheading, onSubmit }: Props) {
  const t = useTranslations("gameday");
  const [lines, setLines] = useState<string[]>(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  const labels = [
    t.cueCardOpeningLabel,
    t.cueCardAnchorLabel(1),
    t.cueCardAnchorLabel(2),
    t.cueCardAnchorLabel(3),
    t.cueCardClosingLabel,
  ];
  const canSave = lines.every((l) => l.trim().length > 0);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit(lines.map((l) => l.trim()));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{t.manualCueCardHeading}</p>
          <p className="text-xs text-slate-400 mt-1">{subheading}</p>
        </div>

        {lines.map((line, i) => (
          <div key={i}>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{labels[i]}</p>
            <textarea
              value={line}
              onChange={(e) => setLines((ls) => ls.map((x, idx) => (idx === i ? e.target.value : x)))}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-lg text-white outline-none focus:border-violet-500 resize-none"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.saveBtn}
        </button>
      </div>
    </div>
  );
}
