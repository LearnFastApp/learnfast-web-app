"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { useTranslations } from "@/lib/i18n";
import WarmupFlow from "@/components/gameday/warmup-flow";

const LOCAL_PLAN_ID = "immediate";

function readCachedLines(): string[] | null {
  try {
    const raw = localStorage.getItem(`gameday:cueCard:${LOCAL_PLAN_ID}`);
    if (!raw) return null;
    return (JSON.parse(raw) as { lines: string[] }).lines;
  } catch {
    return null;
  }
}

/**
 * The <4h-out "immediate" path (see app/api/gameday/events/route.ts): per
 * spec, no speakingEvent/plan is created this close to an event, so this
 * page skips Firestore entirely. The presenter writes their own cue card by
 * hand and it lives in localStorage only — matching the offline-first
 * Warm-Up screen it feeds into, and appropriate for someone who may have no
 * signal at all right now.
 *
 * The localStorage read has to happen in an effect, not a lazy useState
 * initializer — the initializer also runs during server rendering, where
 * localStorage doesn't exist, so it would make the server always render "no
 * card yet" while the client (once real cached lines exist) renders the
 * actual card instead — a hydration mismatch on every visit after the first.
 */
export default function GamedayWarmupNowPage() {
  if (!isGamedayModeEnabled()) notFound();

  const t = useTranslations("gameday");
  const [cachedLines, setCachedLines] = useState<string[] | null>(null);

  useEffect(() => {
    (() => setCachedLines(readCachedLines()))();
  }, []);

  return (
    <WarmupFlow
      planId={LOCAL_PLAN_ID}
      cardId={cachedLines ? "local" : null}
      cachedLines={cachedLines}
      isTaper={true}
      manualEntrySubheading={t.immediateRedirectNote}
      doneHref="/dashboard"
      doneLabel={t.backToDashboardLink}
    />
  );
}
