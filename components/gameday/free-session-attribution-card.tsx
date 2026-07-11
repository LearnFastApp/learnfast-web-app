"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { db } from "@/lib/firebase";
import type { SessionType } from "@/lib/gameday/types";

interface Props {
  rehearsalSessionId: string;
  takeId: string;
}

interface PendingSession {
  id: string;
  eventId: string;
  sessionType: SessionType;
}

/**
 * Free-session attribution (spec §5, mandatory): shown on a rehearsal
 * results page when the recording was NOT started from a plan (no
 * prescribedSessionId on the session) but the user has an active plan with a
 * session pending. "A user must never do a rep and feel it didn't count
 * toward their plan" — so no type-matching is required; any completed rep
 * can satisfy any pending prescription, by the user's own one-tap choice.
 */
export default function FreeSessionAttributionCard({ rehearsalSessionId, takeId }: Props) {
  const { user } = useAuth();
  const t = useTranslations("gameday");
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "dismissed">("idle");

  useEffect(() => {
    if (!user || !isGamedayModeEnabled()) return;
    let cancelled = false;

    (async () => {
      const sessionSnap = await getDoc(doc(db, "rehearsal_sessions", rehearsalSessionId));
      if (cancelled) return;
      if (sessionSnap.data()?.prescribedSessionId) return; // already plan-linked — nothing to offer

      const activeEventSnap = await getDocs(
        query(collection(db, "speakingEvents"), where("userId", "==", user.uid), where("status", "==", "active"), limit(1))
      );
      if (cancelled || activeEventSnap.empty) return;
      const eventId = activeEventSnap.docs[0].id;

      const pendingSnap = await getDocs(
        query(
          collection(db, "prescribedSessions"),
          where("userId", "==", user.uid),
          where("eventId", "==", eventId),
          where("status", "==", "scheduled"),
          orderBy("ordinal", "asc"),
          limit(1)
        )
      );
      if (cancelled || pendingSnap.empty) return;
      const d = pendingSnap.docs[0];
      setPending({ id: d.id, eventId, sessionType: d.data().sessionType });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, rehearsalSessionId]);

  if (!pending || state === "done" || state === "dismissed") return null;

  async function handleAccept() {
    if (!user || !pending) return;
    setState("submitting");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/gameday/prescribed-sessions/${pending.id}/attribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rehearsalSessionId, takeId }),
      });
      setState(res.ok ? "done" : "idle");
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 flex items-center justify-between gap-4">
      <p className="text-sm text-violet-200">{t.attributionPrompt(t.sessionWhy[pending.sessionType] ? pending.sessionType.replace("-", " ") : pending.sessionType)}</p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setState("dismissed")}
          className="text-sm text-slate-400 hover:text-white transition"
        >
          {t.attributionDismiss}
        </button>
        <button
          type="button"
          disabled={state === "submitting"}
          onClick={handleAccept}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition disabled:opacity-50"
        >
          {t.attributionYes}
        </button>
      </div>
    </div>
  );
}
