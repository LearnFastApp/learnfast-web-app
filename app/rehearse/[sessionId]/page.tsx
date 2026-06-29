"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft, Mic, UploadCloud, Square, RotateCcw, Loader2,
  CheckCircle2, BookmarkCheck, Tag, AlertCircle, ChevronRight,
} from "lucide-react";
import { Suspense } from "react";

const DIM_COLORS: Record<string, string> = {
  clarity: "#8b5cf6",
  energy: "#f59e0b",
  engagement: "#22d3ee",
  understanding: "#34d399",
  connection: "#f472b6",
};
const DIMS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_RECORD_SECONDS = 300;
const ACCEPTED_TYPES = ["video/mp4","video/quicktime","video/webm","audio/mpeg","audio/wav","audio/mp4","audio/x-m4a","audio/webm"];

interface Take {
  id: string;
  takeNumber: number;
  status: string;
  scores?: Record<string, number> | null;
  comparison?: string | null;
  strength?: string | null;
  coaching?: string | null;
  nextFocus?: string[] | null;
  encouragement?: string | null;
  audioDurationSeconds?: number | null;
  wordsPerMinute?: number | null;
  fillerWordCount?: number | null;
  isPromoted?: boolean;
}

interface Session {
  title: string;
  tags: string[];
  takeCount: number;
  status: string;
  promotedAssessmentId?: string | null;
}

type PageStage = "loading" | "polling" | "ready" | "recording" | "recorded" | "uploading" | "promoting" | "promoted" | "error";

function ScorePill({ dim, score }: { dim: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: DIM_COLORS[dim] }}
        />
      </div>
      <span className="text-xs font-semibold text-white w-7 text-right">{score}</span>
    </div>
  );
}

function RehearsalPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<Session | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(
    searchParams.get("takeId")
  );
  const [pageStage, setPageStage] = useState<PageStage>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"record" | "upload">("record");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current);
    pollRef.current && clearInterval(pollRef.current);
  }, []);

  const loadSession = useCallback(async () => {
    if (!user) return;
    const [sessionSnap, takesSnap] = await Promise.all([
      getDoc(doc(db, "rehearsal_sessions", sessionId)),
      getDocs(query(collection(db, "rehearsal_sessions", sessionId, "takes"), orderBy("takeNumber", "asc"))),
    ]);
    if (!sessionSnap.exists()) { setPageStage("error"); return; }
    setSession(sessionSnap.data() as Session);
    const loadedTakes: Take[] = takesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Take, "id">) }));
    setTakes(loadedTakes);
    return loadedTakes;
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    loadSession().then((loadedTakes) => {
      if (!loadedTakes?.length) { setPageStage("error"); return; }
      const active = activeTakeId
        ? loadedTakes.find((t) => t.id === activeTakeId) ?? loadedTakes[loadedTakes.length - 1]
        : loadedTakes[loadedTakes.length - 1];
      setActiveTakeId(active.id);
      if (active.status === "complete") {
        setPageStage("ready");
      } else if (active.status === "failed") {
        setPageStage("error"); setErrorMsg("Analysis failed. Please try another take.");
      } else {
        setPageStage("polling");
      }
    });
  }, [user, loadSession, activeTakeId]);

  const pollActiveTake = useCallback(async () => {
    if (!user || !activeTakeId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rehearsal/${sessionId}/${activeTakeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "complete") {
        pollRef.current && clearInterval(pollRef.current);
        await loadSession();
        setPageStage("ready");
      } else if (data.status === "failed") {
        pollRef.current && clearInterval(pollRef.current);
        setPageStage("error");
        setErrorMsg(data.error === "duration_exceeded"
          ? "Recording exceeds the 5-minute limit."
          : "Analysis failed. Please try another take.");
      }
    } catch { /* network glitch — keep polling */ }
  }, [user, activeTakeId, sessionId, loadSession]);

  useEffect(() => {
    if (pageStage !== "polling") return;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(pollActiveTake, 5000);
    pollActiveTake();
    return () => { pollRef.current && clearInterval(pollRef.current); };
  }, [pageStage, pollActiveTake]);

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  async function startRecording() {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordedBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        setPageStage("recorded");
      };
      mr.start(250);
      mediaRef.current = mr;
      setRecordingSeconds(0);
      setPageStage("recording");
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) { stopRecording(); return s + 1; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg("Could not access microphone.");
    }
  }

  function stopRecording() {
    timerRef.current && clearInterval(timerRef.current);
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  }

  async function submitNextTake() {
    if (!user) return;
    const blob = inputMode === "record" ? recordedBlob : uploadFile;
    if (!blob) return;

    setPageStage("uploading");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", blob, inputMode === "record" ? "rehearsal.webm" : (uploadFile as File).name);

      const res = await fetch(`/api/rehearsal/${sessionId}/take`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msgs: Record<string, string> = {
          takes_limit_reached: "You've reached the maximum takes for this rehearsal on Lite. Upgrade to Pro for unlimited takes.",
          file_too_large: "File too large (max 50 MB).",
        };
        setErrorMsg(msgs[data.error] ?? "Something went wrong. Please try again.");
        setPageStage("ready");
        return;
      }

      setActiveTakeId(data.takeId);
      setRecordedBlob(null);
      setUploadFile(null);
      await loadSession();
      setPageStage("polling");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPageStage("ready");
    }
  }

  async function promote() {
    if (!user || !activeTakeId) return;
    setPageStage("promoting");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rehearsal/${sessionId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ takeId: activeTakeId }),
      });
      if (res.ok) {
        await loadSession();
        setPageStage("promoted");
      } else {
        setPageStage("ready");
        setErrorMsg("Could not save take. Please try again.");
      }
    } catch {
      setPageStage("ready");
      setErrorMsg("Network error. Please try again.");
    }
  }

  const activeTake = takes.find((t) => t.id === activeTakeId);
  const isComplete = activeTake?.status === "complete";
  const overallScore = activeTake?.scores
    ? Math.round(Object.values(activeTake.scores).reduce((a, b) => a + b, 0) / 5)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0f1e]/95 backdrop-blur px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/dashboard")} className="text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Rehearsal</p>
          <h1 className="text-base font-bold text-white truncate">
            {session?.title || "Untitled rehearsal"}
          </h1>
          {session?.tags && session.tags.length > 0 && (
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {session.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs text-violet-400">
                  <Tag className="h-2.5 w-2.5" />{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-sm text-slate-400 flex-shrink-0">
          {takes.length} {takes.length === 1 ? "take" : "takes"}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Takes timeline */}
        {takes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {takes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTakeId(t.id);
                  if (t.status === "complete") setPageStage("ready");
                  else if (t.status === "failed") setPageStage("error");
                  else setPageStage("polling");
                }}
                className={`flex-shrink-0 rounded-xl border px-4 py-3 text-left transition ${
                  t.id === activeTakeId
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-300">Take {t.takeNumber}</span>
                  {t.isPromoted && <BookmarkCheck className="h-3 w-3 text-green-400" />}
                  {t.status === "complete" && !t.isPromoted && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  )}
                  {(t.status === "processing" || t.status === "analyzing" || t.status === "queued") && (
                    <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
                  )}
                </div>
                {t.scores && (
                  <div className="space-y-1">
                    {DIMS.map((d) => (
                      <div key={d} className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${t.scores![d]}%`, backgroundColor: DIM_COLORS[d] }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {t.scores && (
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    {Math.round(Object.values(t.scores).reduce((a, b) => a + b, 0) / 5)}
                    <span className="text-slate-600">/100</span>
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main panel */}
        {pageStage === "loading" && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        )}

        {pageStage === "polling" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center space-y-4">
            <Loader2 className="h-10 w-10 text-violet-400 animate-spin mx-auto" />
            <div>
              <p className="font-semibold text-white">Analysing Take {activeTake?.takeNumber}…</p>
              <p className="text-sm text-slate-400 mt-1">Transcribing and coaching — usually 60–90 seconds.</p>
            </div>
          </div>
        )}

        {(pageStage === "ready" || pageStage === "promoted" || pageStage === "promoting") && isComplete && activeTake && (
          <div className="space-y-5">
            {/* Comparison badge */}
            {activeTake.comparison && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">vs last take</p>
                <p className="text-sm font-semibold text-white">{activeTake.comparison}</p>
              </div>
            )}

            {/* Score overview */}
            {activeTake.scores && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-400">Take {activeTake.takeNumber} scores</p>
                  {overallScore !== null && (
                    <span className="text-2xl font-black text-white">
                      {overallScore}<span className="text-sm text-slate-500 font-normal">/100</span>
                    </span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {DIMS.map((d) => (
                    <div key={d} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-300 capitalize w-28 flex-shrink-0">{d}</span>
                      <ScorePill dim={d} score={activeTake.scores![d]} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching output */}
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-5">
              {activeTake.strength && (
                <div>
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1.5">What's working</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeTake.strength}</p>
                </div>
              )}

              {activeTake.coaching && (
                <div>
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1.5">Coaching</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeTake.coaching}</p>
                </div>
              )}

              {activeTake.nextFocus && activeTake.nextFocus.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    {activeTake.nextFocus.length === 1 ? "Focus for your next take" : "Focus for your next take"}
                  </p>
                  <ul className="space-y-2">
                    {activeTake.nextFocus.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                        <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTake.encouragement && (
                <p className="text-sm text-slate-300 italic border-t border-white/10 pt-4 leading-relaxed">
                  &ldquo;{activeTake.encouragement}&rdquo;
                </p>
              )}
            </div>

            {/* Vocal stats */}
            {activeTake.wordsPerMinute && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "WPM", value: activeTake.wordsPerMinute },
                  { label: "Filler words", value: activeTake.fillerWordCount ?? 0 },
                  { label: "Duration", value: activeTake.audioDurationSeconds ? `${Math.round(activeTake.audioDurationSeconds)}s` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {pageStage === "promoted" ? (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Saved to your history</p>
                  <button
                    onClick={() => session?.promotedAssessmentId && router.push(`/ai-assessment/${session.promotedAssessmentId}`)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition"
                  >
                    View in AI Analysis →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {!activeTake.isPromoted && (
                  <button
                    onClick={promote}
                    disabled={pageStage === "promoting"}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
                  >
                    <BookmarkCheck className="h-4 w-4" />
                    {pageStage === "promoting" ? "Saving…" : "Save to history"}
                  </button>
                )}
                <button
                  onClick={() => { setRecordedBlob(null); setUploadFile(null); setInputMode("record"); setPageStage("ready"); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition"
                >
                  <Mic className="h-4 w-4" />
                  Record Take {(activeTake.takeNumber ?? 1) + 1}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recording / upload UI for next take */}
        {pageStage === "ready" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-300">
              Ready for Take {(activeTake?.takeNumber ?? 0) + 1}
            </p>

            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              {(["record", "upload"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setInputMode(m); setRecordedBlob(null); setUploadFile(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                    inputMode === m ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "record" ? <Mic className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                  {m === "record" ? "Record" : "Upload"}
                </button>
              ))}
            </div>

            {inputMode === "record" && pageStage === "ready" && !recordedBlob && (
              <button
                onClick={startRecording}
                className="w-full rounded-xl bg-white/10 py-3 font-semibold text-white hover:bg-white/15 transition flex items-center justify-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Start recording
              </button>
            )}

            {inputMode === "upload" && !recordedBlob && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.webm,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > MAX_FILE_BYTES) { setErrorMsg("File too large (max 50 MB)."); return; }
                    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|mp3|wav|m4a)$/i)) {
                      setErrorMsg("Unsupported format."); return;
                    }
                    setUploadFile(f); setErrorMsg("");
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-white/20 py-6 text-center hover:border-violet-500/50 transition"
                >
                  {uploadFile ? (
                    <p className="text-sm font-semibold text-white">{uploadFile.name}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Click to upload</p>
                  )}
                </button>
              </>
            )}

            {(recordedBlob || uploadFile) && pageStage === "ready" && (
              <button
                onClick={submitNextTake}
                className="w-full rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                Submit Take {(activeTake?.takeNumber ?? 0) + 1} →
              </button>
            )}
          </div>
        )}

        {pageStage === "recording" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center">
                <Mic className="h-7 w-7 text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-mono font-bold text-white">{fmtTime(recordingSeconds)}</p>
            <button
              onClick={stopRecording}
              className="flex items-center justify-center gap-2 mx-auto rounded-xl bg-red-500/20 border border-red-500/30 px-6 py-3 font-semibold text-red-400 hover:bg-red-500/30 transition"
            >
              <Square className="h-4 w-4" />
              Stop recording
            </button>
          </div>
        )}

        {pageStage === "recorded" && recordedBlob && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <p className="text-sm font-semibold text-white">Recording ready — {fmtTime(recordingSeconds)}</p>
            <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
            <div className="flex gap-3">
              <button
                onClick={() => { setRecordedBlob(null); setPageStage("ready"); }}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-record
              </button>
              <button
                onClick={submitNextTake}
                className="flex-1 rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                Submit Take {(activeTake?.takeNumber ?? 0) + 1} →
              </button>
            </div>
          </div>
        )}

        {pageStage === "uploading" && (
          <div className="flex items-center justify-center gap-3 py-10">
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400">Uploading…</span>
          </div>
        )}

        {pageStage === "error" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Something went wrong</p>
              <p className="text-sm text-slate-400 mt-1">{errorMsg || "Please try recording another take."}</p>
              <button
                onClick={() => { setErrorMsg(""); setPageStage("ready"); }}
                className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition"
              >
                Try another take →
              </button>
            </div>
          </div>
        )}

        {errorMsg && pageStage !== "error" && (
          <p className="text-sm text-red-400 text-center">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

export default function RehearsalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    }>
      <RehearsalPageInner />
    </Suspense>
  );
}
