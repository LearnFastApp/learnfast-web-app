"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
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
 * FIRST (written by the plan page and by CueCardView on prior online visits)
 * via lazy state initializers — no effect needed for this synchronous read.
 * If a network reconciliation succeeds it refreshes the cache; if it fails
 * (no signal — the exact scenario this screen exists for), the page already
 * rendered from cache and nothing breaks.
 */
export default function GamedayWarmupPage({ params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) notFound();

  const { eventId } = use(params);
  const { user } = useAuth();
  const [planId, setPlanId] = useState<string | null>(() => readLocal(`gameday:planIdForEvent:${eventId}`));
  const [cardId, setCardId] = useState<string | null>(() => {
    const p = readLocal(`gameday:planIdForEvent:${eventId}`);
    return p ? readLocal(`gameday:cardIdForPlan:${p}`) : null;
  });
  const [cachedLines, setCachedLines] = useState<string[] | null>(() => {
    const p = readLocal(`gameday:planIdForEvent:${eventId}`);
    return p ? readCueCardCache(p) : null;
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        let currentPlanId = planId;
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
    // Intentionally excludes `planId` — this should resolve once per mount
    // from the closure's initial value; setting it mid-effect must not
    // re-trigger a duplicate fetch/reconciliation pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId]);

  return <WarmupFlow planId={planId ?? eventId} cardId={cardId} cachedLines={cachedLines} isTaper={true} />;
}
