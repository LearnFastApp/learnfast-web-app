"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import { effectiveMaxRecordSeconds } from "@/lib/gameday/session-types";
import CreateRehearsalModal from "@/components/create-rehearsal-modal";
import type { SessionType } from "@/lib/gameday/types";

export interface PrescriptionCardSession {
  id: string;
  planId: string;
  sessionType: SessionType;
  ordinal: number;
  status: "scheduled" | "completed" | "skipped" | "rolled";
  focusDimension?: string | null;
  constraint?: {
    maxRecordSeconds?: number;
    standing?: boolean;
    noNotes?: boolean;
    audioOptional?: boolean;
  } | null;
}

interface Props {
  session: PrescriptionCardSession;
  ordinalLabel: string;
  phaseOrDayLabel: string;
  tierMaxSeconds: number;
}

/**
 * The "Session (prescription) card" from spec §5. Constraints are always
 * advisory copy here — never verified or enforced (friction doctrine). The
 * primary button opens the EXISTING rehearsal record flow with session
 * context preloaded via CreateRehearsalModal's additive props.
 */
export default function PrescriptionCard({ session, ordinalLabel, phaseOrDayLabel, tierMaxSeconds }: Props) {
  const t = useTranslations("gameday");
  const locale = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  const isDone = session.status === "completed";
  const constraintLabels: string[] = [];
  if (session.constraint?.maxRecordSeconds) constraintLabels.push(t.constraintMaxSeconds(session.constraint.maxRecordSeconds));
  if (session.constraint?.standing) constraintLabels.push(t.constraintStanding);
  if (session.constraint?.noNotes) constraintLabels.push(t.constraintNoNotes);
  if (session.constraint?.audioOptional) constraintLabels.push(t.constraintAudioOptional);

  const maxRecordSeconds = effectiveMaxRecordSeconds(tierMaxSeconds, session.sessionType);

  return (
    <div className={`rounded-2xl border p-5 ${isDone ? "border-white/5 bg-[#0d1220] opacity-60" : "border-white/10 bg-[#111827]"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {phaseOrDayLabel} · {ordinalLabel}
      </p>
      <h3 className="text-lg font-bold text-white mt-1 capitalize">{session.sessionType.replace("-", " ")}</h3>

      {session.sessionType === "triage" && <p className="mt-1 text-xs text-amber-300/80">{t.baselineFraming}</p>}

      <p className="mt-2 text-sm text-slate-400">{t.sessionWhy[session.sessionType]}</p>

      {constraintLabels.length > 0 && <p className="mt-2 text-xs text-slate-500">{constraintLabels.join(" · ")}</p>}

      {!isDone ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 transition"
        >
          {t.startSessionBtn}
        </button>
      ) : (
        <p className="mt-4 text-sm text-green-400">✓</p>
      )}

      {modalOpen && (
        <CreateRehearsalModal
          onClose={() => setModalOpen(false)}
          locale={locale}
          maxRecordSeconds={maxRecordSeconds}
          initialTitle={`${session.sessionType} — ${phaseOrDayLabel}`}
          initialTags={[session.sessionType]}
          planId={session.planId}
          prescribedSessionId={session.id}
          sessionType={session.sessionType}
        />
      )}
    </div>
  );
}
