"use client";

import { useEffect, useState, use, Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { useTranslations } from "@/lib/i18n";
import WarmupFlow from "@/components/gameday/warmup-flow";

function readCueCardCache(planId: string): string[] | null {
  try {
    const raw = localStorage.getItem(`gameday:cueCard:${planId}`);
    if (!raw) return null;
    return (JSON.parse(raw) as { lines: string[] }).lines;
  } catch {
    return null;
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Offline-first by design: resolves planId/cardId/lines from localStorage
 * (written by the plan page and by CueCardView on prior online visits). That
 * read has to happen inside an effect, not a lazy useState initializer —
 * localStorage doesn't exist during server rendering, so an initializer that
 * reads it would make the server always render "no card yet" while the
 * client, once real cached data exists, renders the actual card instead —
 * a hydration mismatch (and remount) on every visit after the first. State
 * starts identically empty on server and client; the effect (client-only,
 * post-mount) fills it in immediately after. If a network reconciliation
 * succeeds it refreshes the cache; if it fails (no signal — the exact
 * scenario this screen exists for), whatever was cached still rendered.
 */
function GamedayWarmupPageInner({ params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) notFound();

  const { eventId } = use(params);
  const { user } = useAuth();
  const t = useTranslations("gameday");
  const searchParams = useSearchParams();
  // Deep-linked from "View it on your Warm-Up screen" right after generating
  // a cue card — that's a "come check what I built" visit, not the actual
  // event-day sequence, so it skips the breathing/first-line ritual.
  const initialStep = searchParams.get("step") === "cuecard" ? "cuecard" as const : undefined;
  const [planId, setPlanId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [cachedLines, setCachedLines] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        // Synchronous local reads first — client-only (this whole callback
        // only ever runs post-mount, in the browser), so no hydration risk.
        let currentPlanId = readLocal(`gameday:planIdForEvent:${eventId}`);
        if (currentPlanId) {
          setPlanId(currentPlanId);
          const cachedCardId = readLocal(`gameday:cardIdForPlan:${currentPlanId}`);
          if (cachedCardId) setCardId(cachedCardId);
          const cachedLinesVal = readCueCardCache(currentPlanId);
          if (cachedLinesVal) setCachedLines(cachedLinesVal);
        }

        if (!currentPlanId) {
          const token = await user.getIdToken();
          const res = await fetch(`/api/gameday/events/${eventId}/plan`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return;
          const json = await res.json();
          currentPlanId = json.plan.id;
          if (cancelled || !currentPlanId) return;
          setPlanId(currentPlanId);
          localStorage.setItem(`gameday:planIdForEvent:${eventId}`, currentPlanId);
        }

        const planSnap = await getDoc(doc(db, "plans", currentPlanId));
        const gotCardId = planSnap.data()?.cueCardId as string | undefined;
        if (cancelled || !gotCardId) return;
        setCardId(gotCardId);
        localStorage.setItem(`gameday:cardIdForPlan:${currentPlanId}`, gotCardId);

        const cardSnap = await getDoc(doc(db, "cueCards", gotCardId));
        const lines = cardSnap.data()?.lines as string[] | undefined;
        if (cancelled || !lines) return;
        setCachedLines(lines);
        localStorage.setItem(`gameday:cueCard:${currentPlanId}`, JSON.stringify({ lines, updatedAt: new Date().toISOString() }));
      } catch {
        // Offline or transient — whatever was cached above already rendered.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, eventId]);

  async function handleManualSave(lines: string[]): Promise<{ cardId: string } | void> {
    if (!user || !planId) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/gameday/cue-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ planId, manualLines: lines }),
    });
    if (!res.ok) return;
    const data = await res.json();
    localStorage.setItem(`gameday:cardIdForPlan:${planId}`, data.cardId);
    localStorage.setItem(
      `gameday:cueCard:${planId}`,
      JSON.stringify({ lines: data.lines, updatedAt: new Date().toISOString() })
    );
    return { cardId: data.cardId };
  }

  return (
    <WarmupFlow
      planId={planId ?? eventId}
      cardId={cardId}
      cachedLines={cachedLines}
      isTaper={true}
      manualEntrySubheading={t.extractionFailedFallback}
      onManualSave={handleManualSave}
      initialStep={initialStep}
      doneHref={`/gameday/${eventId}`}
      doneLabel={t.backToPlanLink}
    />
  );
}

export default function GamedayWarmupPage(props: { params: Promise<{ eventId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070d] flex items-center justify-center text-slate-500 text-sm">…</div>
      }
    >
      <GamedayWarmupPageInner {...props} />
    </Suspense>
  );
}
