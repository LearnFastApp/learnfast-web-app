"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import { db } from "@/lib/firebase";

interface Props {
  planId: string;
  rehearsalSessionId: string;
  takeId: string;
}

type State = "idle" | "generating" | "done" | "failed";

/**
 * Cue-card generation needs real content to work from — the results page is
 * the moment that content exists. Lets a presenter generate it right here
 * from whatever take they just recorded, rather than waiting on the
 * automatic best-fullrun trigger or the roadmap's "skip ahead" action, either
 * of which can leave someone with no cue card and nothing to show for it.
 * Hits the same POST /api/gameday/cue-cards route the automatic path and the
 * Warm-Up manual-entry fallback both use — no session-type restriction there.
 */
export default function GenerateCueCardCard({ planId, rehearsalSessionId, takeId }: Props) {
  const { user } = useAuth();
  const t = useTranslations("gameday");
  const [eventId, setEventId] = useState<string | null>(null);
  const [hasCueCard, setHasCueCard] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, "plans", planId));
      if (cancelled || !snap.exists()) return;
      const data = snap.data();
      setEventId((data.eventId as string) ?? null);
      setHasCueCard(!!data.cueCardId);
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  async function handleGenerate() {
    if (!user) return;
    setState("generating");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/gameday/cue-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, rehearsalSessionId, takeId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setState("failed");
        return;
      }
      setLines(data.lines as string[]);
      setHasCueCard(true);
      setState("done");
    } catch {
      setState("failed");
    }
  }

  if (!eventId) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
      {state === "done" && lines ? (
        <>
          <p className="text-sm font-semibold text-amber-300">{t.cueCardReadyHeading}</p>
          <div className="space-y-1.5">
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-slate-200">
                {line}
              </p>
            ))}
          </div>
          <a
            href={`/gameday/${eventId}/warmup?step=cuecard`}
            className="inline-block text-sm font-medium text-amber-300 hover:text-amber-200 transition"
          >
            {t.viewOnWarmupLink} →
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-amber-200">{hasCueCard ? t.regenerateCueCardPrompt : t.generateCueCardPrompt}</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={state === "generating"}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition disabled:opacity-50"
          >
            {state === "generating" ? t.generatingCueCard : hasCueCard ? t.regenerateCueCardBtn : t.generateCueCardBtn}
          </button>
          {state === "failed" && <p className="text-xs text-red-400">{t.cueCardGenerationFailed}</p>}
        </>
      )}
    </div>
  );
}
