"use client";

import { useLocale, useSetLocale } from "@/lib/i18n";
import type { SupportedLocale } from "@/locales/types";
import { trackLocaleSet } from "@/lib/locale/analytics";

interface Props {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: Props) {
  const locale = useLocale();
  const setLocale = useSetLocale();

  async function handleSwitch(next: SupportedLocale) {
    if (next === locale) return;
    await setLocale(next);
    trackLocaleSet(next, "setting");
    // Reload to apply locale across all inline-translated content
    window.location.reload();
  }

  return (
    <div className={`flex items-center gap-1 text-sm font-semibold ${className}`}>
      <button
        onClick={() => handleSwitch("en")}
        className={`rounded px-1.5 py-0.5 transition ${
          locale === "en" ? "text-white bg-white/15" : "text-slate-400 hover:text-slate-200"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="text-slate-600">/</span>
      <button
        onClick={() => handleSwitch("fr")}
        className={`rounded px-1.5 py-0.5 transition ${
          locale === "fr" ? "text-white bg-white/15" : "text-slate-400 hover:text-slate-200"
        }`}
        aria-label="Passer en français"
      >
        FR
      </button>
    </div>
  );
}
