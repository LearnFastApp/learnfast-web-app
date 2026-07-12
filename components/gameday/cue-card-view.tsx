"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Printer } from "lucide-react";
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
const SEEN_KEY_PREFIX = "gameday:cueCardSeen:";
// Approx one Letter/A4 printable page height in CSS px at 96dpi, after our
// own print padding (see .cue-card-print-area) — there's no way to know the
// paper size the user will actually pick in the print dialog ahead of time,
// so this targets the common case rather than guaranteeing every printer.
const PRINT_PAGE_HEIGHT_PX = 950;

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
 * `initialLines` is the authoritative current content — the parent page
 * already did its own offline-first cache-then-network resolution before
 * passing it down, so this view always trusts the prop rather than reading
 * its own copy of the cache (that used to duplicate the read keyed only by
 * planId, which meant a regenerated card's stale predecessor won forever).
 * Every successful edit still writes through to both Firestore and
 * localStorage so the Warm-Up screen can render with zero network next time.
 */
export default function CueCardView({ planId, cardId, initialLines, isTaper }: Props) {
  const t = useTranslations("gameday");
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>(initialLines);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>(initialLines);
  const [showTaperAdvisory, setShowTaperAdvisory] = useState(false);
  // First time this exact card has ever been viewed on this device — plays a
  // one-time flip reveal. Reading and marking-seen happen in the same lazy
  // initializer so a re-render never replays it.
  const [firstView] = useState(() => {
    try {
      if (localStorage.getItem(SEEN_KEY_PREFIX + cardId)) return false;
      localStorage.setItem(SEEN_KEY_PREFIX + cardId, "1");
      return true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    writeCache(planId, initialLines);
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

  // Measures the card's actual (unscaled) rendered height and, only if it
  // would run past one printed page, sets CSS variables that a
  // print-media-only transform+height rule consumes — so this never affects
  // the on-screen view, only what comes out of the print dialog.
  function handlePrint() {
    const el = printAreaRef.current;
    if (el) {
      el.style.removeProperty("--print-scale");
      el.style.removeProperty("--print-scaled-height");
      const naturalHeight = el.scrollHeight;
      if (naturalHeight > PRINT_PAGE_HEIGHT_PX) {
        const scale = PRINT_PAGE_HEIGHT_PX / naturalHeight;
        el.style.setProperty("--print-scale", scale.toFixed(3));
        el.style.setProperty("--print-scaled-height", `${PRINT_PAGE_HEIGHT_PX}px`);
      }
    }
    window.print();
  }

  const labels = [t.cueCardOpeningLabel, t.cueCardAnchorLabel(1), t.cueCardAnchorLabel(2), t.cueCardAnchorLabel(3), t.cueCardClosingLabel];

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center p-6 pt-10 pb-28 gap-8">
      <div className={`cue-card-object w-full max-w-sm ${firstView ? "cue-card-flip-in" : ""}`}>
        <div ref={printAreaRef} className="cue-card-print-area space-y-5">
          {(editing ? drafts : lines).map((line, i) => (
            <div key={i}>
              <p className="cue-card-print-label text-xs uppercase tracking-wide text-slate-500 mb-1">{labels[i]}</p>
              {editing ? (
                <textarea
                  value={drafts[i]}
                  onChange={(e) => setDrafts((d) => d.map((x, idx) => (idx === i ? e.target.value : x)))}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-lg text-white outline-none focus:border-violet-500 resize-none"
                />
              ) : (
                <p className="cue-card-print-line text-2xl font-bold leading-snug">{line}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5 transition"
            >
              {t.editBtn}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5 transition"
            >
              <Printer className="h-4 w-4" />
              {t.printBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
