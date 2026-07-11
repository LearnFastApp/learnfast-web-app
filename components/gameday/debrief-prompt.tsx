"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/i18n";
import CreateRehearsalModal from "@/components/create-rehearsal-modal";

interface Props {
  eventId: string;
  planId: string;
}

/**
 * 72h post-event prompt (spec §5): one debrief rep, then a single upsell
 * card. The debrief-completion call fires when the user starts the rep
 * (not gated on waiting for the recording to finish) — matches the friction
 * doctrine (advise, never enforce/block) and marks the event debriefed +
 * resumes any paused block eagerly.
 */
export default function DebriefPrompt({ eventId, planId }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("gameday");
  const locale = useLocale();
  const [modalOpen, setModalOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  async function startDebrief() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/gameday/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
      });
    } catch {
      // best-effort — the reflective rep matters more than this bookkeeping call
    }
    setModalOpen(true);
    setShowUpsell(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
      {!showUpsell ? (
        <>
          <p className="text-sm text-slate-300 mb-4">{t.debriefPrompt}</p>
          <button
            type="button"
            onClick={startDebrief}
            className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            {t.startSessionBtn}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-300 mb-4">{t.debriefUpsellPrompt}</p>
          <button
            type="button"
            onClick={() => router.push("/gameday")}
            className="rounded-xl border border-violet-500/40 px-5 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/10 transition"
          >
            {t.nextDateBtn}
          </button>
        </>
      )}

      {modalOpen && (
        <CreateRehearsalModal
          onClose={() => setModalOpen(false)}
          locale={locale}
          initialTags={["debrief"]}
          planId={planId}
          sessionType="debrief"
        />
      )}
    </div>
  );
}
