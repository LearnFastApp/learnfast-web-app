"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslations } from "@/lib/i18n";

interface Props {
  planId: string;
  cardId: string;
  initialLines: string[];
  /** Once the taper begins, editing shows a one-line advisory with a single-tap
   * override first — never a hard block (friction doctrine). */
  isTaper: boolean;
}

const STORAGE_KEY_PREFIX = "gameday:cueCard:";

function readCache(planId: string): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + planId);
    if (!raw) return null;
    return (JSON.parse(raw) as { lines: string[] }).lines;
  } catch {
    return null;
  }
}

function writeCache(planId: string, lines: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + planId, JSON.stringify({ lines, updatedAt: new Date().toISOString() }));
  } catch {
    // best-effort — a full localStorage or private-browsing mode shouldn't crash the view
  }
}

/**
 * Full-screen cue card (spec §5): large type, 5 lines, dark-mode friendly
 * (matches the app's existing dark-only design). Editable at ALL times.
 * Offline-first: reads from localStorage before anything else, and every
 * successful edit writes through to both Firestore and localStorage so the
 * Warm-Up screen can render with zero network.
 */
export default function CueCardView({ planId, cardId, initialLines, isTaper }: Props) {
  const t = useTranslations("gameday");
  const [lines, setLines] = useState<string[]>(() => readCache(planId) ?? initialLines);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>(() => readCache(planId) ?? initialLines);
  const [showTaperAdvisory, setShowTaperAdvisory] = useState(false);

  useEffect(() => {
    // Seed the cache on first-ever view (nothing to read yet setState-side —
    // the lazy initializers above already hydrated `lines`/`drafts` from it
    // if it existed).
    if (!readCache(planId)) writeCache(planId, initialLines);
  }, [planId, initialLines]);

  function startEdit() {
    if (isTaper) {
      setShowTaperAdvisory(true);
      return;
    }
    setDrafts(lines);
    setEditing(true);
  }

  function confirmTaperOverride() {
    setShowTaperAdvisory(false);
    setDrafts(lines);
    setEditing(true);
  }

  async function saveEdit() {
    setLines(drafts);
    writeCache(planId, drafts);
    setEditing(false);
    try {
      await updateDoc(doc(db, "cueCards", cardId), { lines: drafts, updatedAt: serverTimestamp() });
    } catch {
      // Offline or transient failure — the local cache is already updated,
      // so the Warm-Up screen still reflects the edit; Firestore reconciles
      // opportunistically next time this view loads online.
    }
  }

  const labels = [t.cueCardOpeningLabel, t.cueCardAnchorLabel(1), t.cueCardAnchorLabel(2), t.cueCardAnchorLabel(3), t.cueCardClosingLabel];

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {(editing ? drafts : lines).map((line, i) => (
          <div key={i}>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{labels[i]}</p>
            {editing ? (
              <textarea
                value={drafts[i]}
                onChange={(e) => setDrafts((d) => d.map((x, idx) => (idx === i ? e.target.value : x)))}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-lg text-white outline-none focus:border-violet-500 resize-none"
              />
            ) : (
              <p className="text-2xl font-bold leading-snug">{line}</p>
            )}
          </div>
        ))}

        {showTaperAdvisory && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <p className="text-sm text-amber-300">{t.taperEditWarning}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTaperAdvisory(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                {t.attributionDismiss}
              </button>
              <button
                type="button"
                onClick={confirmTaperOverride}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black hover:bg-amber-400"
              >
                {t.editAnywayBtn}
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <button
            type="button"
            onClick={saveEdit}
            className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            {t.saveBtn}
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="w-full rounded-xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5 transition"
          >
            {t.editBtn}
          </button>
        )}
      </div>
    </div>
  );
}
