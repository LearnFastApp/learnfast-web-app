"use client";

import { useEffect, useRef } from "react";

interface Props {
  script: string;
  /** Elapsed recording time in seconds — drives scroll position. Fully controlled: no internal timer. */
  elapsedSeconds: number;
  /** Assumed reading pace used to estimate total scroll duration. Matches the "ideal range" (110-150) already referenced in the rehearsal coaching prompt. */
  wordsPerMinute?: number;
}

const DEFAULT_WPM = 140;

/**
 * Auto-scrolling teleprompter for the active-recording screen. Scroll
 * position is derived purely from `elapsedSeconds` (already ticking once a
 * second in the parent's recording timer) against an estimated total
 * read-through duration — no independent animation loop, so it can never
 * drift out of sync with the recording clock.
 */
export default function TeleprompterOverlay({ script, elapsedSeconds, wordsPerMinute = DEFAULT_WPM }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(1, (wordCount / wordsPerMinute) * 60);
    const fraction = Math.min(1, elapsedSeconds / estimatedSeconds);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTop = fraction * maxScroll;
  }, [elapsedSeconds, script, wordsPerMinute]);

  return (
    <div
      ref={containerRef}
      className="relative h-56 overflow-y-hidden rounded-2xl border border-white/10 bg-black/70 px-6 py-8"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
      }}
    >
      <p className="text-xl leading-relaxed text-white whitespace-pre-wrap font-medium text-center">{script}</p>
    </div>
  );
}
