"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DIM_COLOURS, DIMS } from "@/lib/rank";
import type { RankInfo } from "@/lib/rank";
import { ArrowLeft, Loader2, Send, Play, Pause, ChevronRight } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  tags: string[];
  presenterId: string;
  presenterName: string | null;
  presenterJobTitle: string | null;
  rank: RankInfo;
  featuredTake: {
    id: string;
    audioUrl: string | null;
    scores: Record<string, number> | null;
    audioDurationSeconds: number | null;
    wordsPerMinute: number | null;
    fillerWordCount: number | null;
    strength: string | null;
    coaching: string | null;
    nextFocus: string[] | null;
    encouragement: string | null;
  } | null;
  commentCount: number;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRank: RankInfo | null;
  dimension: string | null;
  comment: string | null;
  reaction: string | null;
  createdAt: string;
}

const REACTIONS = [
  { key: "strong",     label: "Strong",          emoji: "🔥" },
  { key: "helpful",    label: "Helpful",          emoji: "💡" },
  { key: "insightful", label: "Insightful",       emoji: "⭐" },
  { key: "needs_work", label: "Needs work",       emoji: "🔧" },
];

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition hover:brightness-125"
          style={{ backgroundColor: "#8b5cf6" }}
        >
          {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
        </button>
        <div className="flex-1">
          <div
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              if (audioRef.current) { audioRef.current.currentTime = pct * duration; }
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%", backgroundColor: "#8b5cf6" }}
            />
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">
          {fmt(progress)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

function ScoreRow({ dim, score }: { dim: string; score: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm capitalize w-28 flex-shrink-0" style={{ color: DIM_COLOURS[dim as keyof typeof DIM_COLOURS] }}>
        {dim}
      </span>
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: DIM_COLOURS[dim as keyof typeof DIM_COLOURS] }}
        />
      </div>
      <span className="text-xs font-mono text-white w-7 text-right">{score}</span>
    </div>
  );
}

export default function FeedViewerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [item, setItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [selectedDim, setSelectedDim] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    const res = await fetch(`/api/feed`);
    if (!res.ok) return;
    const data = await res.json();
    const found = (data.items as FeedItem[]).find((i) => i.id === sessionId);
    if (found) setItem(found);
  }, [sessionId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/feed/${sessionId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments ?? []);
    }
  }, [sessionId]);

  useEffect(() => {
    Promise.all([fetchItem(), fetchComments()]).finally(() => setLoading(false));
  }, [fetchItem, fetchComments]);

  async function submitComment(reaction?: string) {
    if (!user) return;
    if (!reaction && !commentText.trim()) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/feed/${sessionId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: reaction ? null : commentText.trim(),
          dimension: selectedDim || null,
          reaction: reaction ?? null,
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((c) => [...c, newComment]);
        setCommentText("");
        setSelectedDim("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const take = item?.featuredTake;
  const overallScore = take?.scores
    ? Math.round(Object.values(take.scores).reduce((a, b) => a + b, 0) / 5)
    : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#05070d" }}>
      <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
    </div>
  );

  if (!item) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#05070d" }}>
      <p className="text-slate-500 text-sm">Rehearsal not found or no longer public.</p>
    </div>
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#05070d" }}>
      <header className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4" style={{
        backgroundColor: "rgba(5,7,13,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button onClick={() => router.push("/feed")} className="text-slate-500 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">{item.presenterName ?? "Anonymous"} · {item.rank.name}</p>
          <h1 className="text-base font-bold text-white truncate">{item.title}</h1>
        </div>
        {overallScore !== null && (
          <span className="text-2xl font-black font-mono text-white flex-shrink-0">
            {overallScore}<span className="text-sm text-slate-500 font-normal">/100</span>
          </span>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Audio */}
        {take?.audioUrl && <AudioPlayer url={take.audioUrl} />}

        {/* Scores */}
        {take?.scores && (
          <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Assessment</p>
            {DIMS.map((d) => (
              <ScoreRow key={d} dim={d} score={take.scores![d] ?? 0} />
            ))}
          </div>
        )}

        {/* AI coaching */}
        {(take?.strength || take?.coaching) && (
          <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(139,92,246,0.15)" }}>
            {take.strength && (
              <div>
                <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1.5">What's working</p>
                <p className="text-sm text-slate-300 leading-relaxed">{take.strength}</p>
              </div>
            )}
            {take.coaching && (
              <div>
                <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1.5">AI Coaching</p>
                <p className="text-sm text-slate-300 leading-relaxed">{take.coaching}</p>
              </div>
            )}
            {take.nextFocus && take.nextFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Next focus</p>
                <ul className="space-y-1.5">
                  {take.nextFocus.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick reaction</p>
          <div className="flex gap-2 flex-wrap">
            {REACTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => user ? submitComment(r.key) : null}
                disabled={submitting || !user}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition disabled:opacity-40 hover:brightness-125"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8",
                }}
              >
                <span>{r.emoji}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Peer coaching ({comments.length})
          </p>

          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl p-3.5" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white">{c.authorName}</span>
                    {c.authorRank && (
                      <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{
                        backgroundColor: `${(c.authorRank as RankInfo).colour}18`,
                        color: (c.authorRank as RankInfo).colour,
                      }}>
                        {(c.authorRank as RankInfo).name}
                      </span>
                    )}
                    {c.reaction && (
                      <span className="text-xs ml-auto">
                        {REACTIONS.find((r) => r.key === c.reaction)?.emoji}
                      </span>
                    )}
                    {c.dimension && (
                      <span className="text-[9px] font-semibold ml-auto" style={{ color: DIM_COLOURS[c.dimension as keyof typeof DIM_COLOURS] }}>
                        {c.dimension}
                      </span>
                    )}
                  </div>
                  {c.comment && (
                    <p className="text-sm text-slate-300 leading-relaxed">{c.comment}</p>
                  )}
                  <p className="text-[10px] text-slate-700 mt-1.5">
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Comment composer */}
          {user ? (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Dimension tag */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedDim("")}
                  className="text-[10px] rounded px-2 py-0.5 transition"
                  style={{
                    backgroundColor: selectedDim === "" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: selectedDim === "" ? "white" : "#64748b",
                  }}
                >
                  General
                </button>
                {DIMS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDim(d === selectedDim ? "" : d)}
                    className="text-[10px] rounded px-2 py-0.5 capitalize transition"
                    style={{
                      backgroundColor: selectedDim === d ? `${DIM_COLOURS[d]}18` : "rgba(255,255,255,0.04)",
                      color: selectedDim === d ? DIM_COLOURS[d] : "#64748b",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your coaching feedback…"
                  rows={2}
                  maxLength={500}
                  className="flex-1 resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
                <button
                  onClick={() => submitComment()}
                  disabled={submitting || !commentText.trim()}
                  className="rounded-lg px-3 flex items-center justify-center transition disabled:opacity-30"
                  style={{ backgroundColor: "#8b5cf6" }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm text-slate-500">
                <a href="/signin" className="text-violet-400 hover:text-violet-300">Sign in</a> to leave coaching feedback
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
