"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Brain,
  Mic,
  Upload,
  Square,
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  Loader2,
  Mail,
} from "lucide-react";

type Tab = "record" | "upload";
type RecordStage = "idle" | "requesting" | "recording" | "preview";
type PageStage = "form" | "trimming" | "submitting" | "submitted" | "error";

const MAX_DURATION_SECONDS = 90;
const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/webm",
  "video/mp4", "video/quicktime", "video/webm",
];
const ACCEPTED_EXT = ".mp3,.wav,.m4a,.webm,.mp4,.mov";

const DIM_COLORS = ["#8b5cf6", "#f59e0b", "#22d3ee", "#34d399", "#f472b6"];
const DIM_NAMES = ["Clarity", "Energy", "Engagement", "Understanding", "Connection"];
const RESEARCH = [
  "Cognitive Load Theory · Sweller, 1988",
  "Vocal Dynamism Research · Burgoon & Saine, 1978",
  "Narrative Transportation Theory · Green & Brock, 2000",
  "Dual Coding Theory · Paivio, 1971",
  "Rapport Theory · Tickle-Degnen & Rosenthal, 1990",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

async function checkDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const ch = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bps = 2;
  const dataLen = len * ch * bps;
  const ab = new ArrayBuffer(44 + dataLen);
  const dv = new DataView(ab);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF"); dv.setUint32(4, 36 + dataLen, true);
  str(8, "WAVE"); str(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * ch * bps, true); dv.setUint16(32, ch * bps, true);
  dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      dv.setInt16(off, s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

async function trimAudioTo90s(file: File): Promise<{ blob: Blob; trimmed: boolean }> {
  try {
    const ab = await file.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(ab);
    await ctx.close();
    if (audioBuffer.duration <= MAX_DURATION_SECONDS + 2) {
      return { blob: file, trimmed: false };
    }
    const sr = audioBuffer.sampleRate;
    const ch = audioBuffer.numberOfChannels;
    const samples = Math.floor(MAX_DURATION_SECONDS * sr);
    const offline = new OfflineAudioContext(ch, samples, sr);
    const src = offline.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return { blob: audioBufferToWav(rendered), trimmed: true };
  } catch {
    // OOM or unsupported format — return original; server handles via audio_end_at
    return { blob: file, trimmed: false };
  }
}

export default function TryPage() {
  const [tab, setTab] = useState<Tab>("record");
  const [email, setEmail] = useState("");
  const [pageStage, setPageStage] = useState<PageStage>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Upload tab
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Record tab
  const [recordStage, setRecordStage] = useState<RecordStage>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Prevent browser file-drop navigation
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, []);

  // Cleanup recording resources on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
  }

  async function startRecording() {
    setRecordStage("requesting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordStage("preview");
      };

      recorder.start(200);
      setRecordStage("recording");
      setElapsed(0);

      // Count up
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Auto-stop at 90s
      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_DURATION_SECONDS * 1000);
    } catch (err) {
      console.error("[try/record] getUserMedia failed:", err);
      setRecordStage("idle");
      setErrorMsg("Microphone access was denied. Please allow microphone access and try again.");
      setPageStage("error");
    }
  }

  function stopRecording() {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecording() {
    stopTimer();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordStage("idle");
    setElapsed(0);
    setIsPlaying(false);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
  }

  function togglePlayback() {
    if (!audioPreviewRef.current || !recordedUrl) return;
    if (isPlaying) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPreviewRef.current.src = recordedUrl;
      audioPreviewRef.current.play();
      setIsPlaying(true);
      audioPreviewRef.current.onended = () => setIsPlaying(false);
    }
  }

  const handleUploadFile = useCallback((file: File) => {
    const isAccepted =
      ACCEPTED_TYPES.includes(file.type) ||
      /\.(mp3|wav|m4a|webm|mp4|mov)$/i.test(file.name);
    if (!isAccepted) {
      setErrorMsg("Unsupported format. Please upload an MP3, WAV, M4A, WebM, MP4 or MOV file.");
      setPageStage("error");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setErrorMsg("File is too large. Please use a file under 200 MB (90-second recordings are typically 1–20 MB).");
      setPageStage("error");
      return;
    }
    setUploadFile(file);
    setErrorMsg("");
    if (pageStage === "error") setPageStage("form");
  }, [pageStage]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUploadFile(file);
    },
    [handleUploadFile]
  );

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      setPageStage("error");
      return;
    }

    const rawBlob = tab === "record" ? recordedBlob : uploadFile;
    if (!rawBlob) {
      setErrorMsg(
        tab === "record"
          ? "Please record your presentation first."
          : "Please select a file to upload."
      );
      setPageStage("error");
      return;
    }

    // For uploaded files longer than 90s, trim to 90s in-browser before uploading
    let audioBlob: Blob = rawBlob;
    let fileName: string;

    if (tab === "upload" && uploadFile) {
      const duration = await checkDuration(uploadFile);
      if (duration > MAX_DURATION_SECONDS + 2) {
        setPageStage("trimming");
        const result = await trimAudioTo90s(uploadFile);
        audioBlob = result.blob;
        fileName = result.trimmed
          ? `trimmed-${Date.now()}.wav`
          : uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      } else {
        fileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      }
    } else {
      fileName = `recording-${Date.now()}.webm`;
    }

    setPageStage("submitting");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("email", trimmedEmail);
      formData.append("file", audioBlob, fileName);

      const res = await fetch("/api/guest-assessment", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { error?: string; token?: string };

      if (!res.ok) {
        if (data.error === "already_used") {
          setErrorMsg(
            "This email has already been used for a free assessment. Sign in to your account to run more assessments, or try our live audience feedback feature."
          );
        } else {
          setErrorMsg(
            `Something went wrong (${data.error ?? res.status}). Please try again.`
          );
        }
        setPageStage("error");
        return;
      }

      if (data.token) {
        window.location.href = `/try/${data.token}`;
      }
    } catch (err) {
      console.error("[try] submit error:", err);
      setErrorMsg(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}. Please try again.`
      );
      setPageStage("error");
    }
  }

  const hasContent =
    tab === "record" ? recordStage === "preview" : uploadFile !== null;

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/icon-mark.png" alt="" width={28} height={20} />
            <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
              LEARN<span className="font-light">FAST</span>
            </span>
          </div>
          <a
            href="/auth/login"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Sign in
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <Brain className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-3">
            Free AI Presentation Coach
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Upload or record any presentation — any length. Get scored across
            five research-backed dimensions in 1–3 minutes. No account required.
          </p>
        </div>

        {/* Error banner */}
        {pageStage === "error" && errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-6">
          <button
            onClick={() => { setTab("record"); setUploadFile(null); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "record"
                ? "bg-[#1e293b] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Mic className="h-4 w-4" />
            Record
          </button>
          <button
            onClick={() => { setTab("upload"); resetRecording(); }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "upload"
                ? "bg-[#1e293b] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload file
          </button>
        </div>

        {/* Record tab */}
        {tab === "record" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden mb-6">
            {recordStage === "idle" && (
              <div className="p-10 flex flex-col items-center text-center">
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 hover:bg-red-500/20 hover:border-red-400 transition flex items-center justify-center mb-5 group"
                >
                  <Mic className="h-8 w-8 text-red-400 group-hover:text-red-300 transition" />
                </button>
                <p className="text-white font-semibold mb-1">Click to start recording</p>
                <p className="text-slate-500 text-sm">Microphone audio · max 90 seconds</p>
              </div>
            )}

            {recordStage === "requesting" && (
              <div className="p-10 flex flex-col items-center text-center">
                <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
                <p className="text-slate-300 text-sm">Requesting microphone access…</p>
              </div>
            )}

            {recordStage === "recording" && (
              <div className="p-10 flex flex-col items-center text-center">
                {/* Pulsing ring */}
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <button
                    onClick={stopRecording}
                    className="relative w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30 transition flex items-center justify-center"
                  >
                    <Square className="h-7 w-7 text-red-400 fill-red-400" />
                  </button>
                </div>
                <p className="text-white font-bold text-2xl font-mono mb-1">
                  {formatTime(elapsed)}
                </p>
                <p className="text-slate-500 text-sm">
                  Click to stop · auto-stops at {formatTime(MAX_DURATION_SECONDS)}
                </p>
                <div className="mt-4 w-full max-w-xs bg-white/[0.04] rounded-full h-1.5">
                  <div
                    className="bg-red-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((elapsed / MAX_DURATION_SECONDS) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {recordStage === "preview" && recordedUrl && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={togglePlayback}
                    className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
                  >
                    {isPlaying
                      ? <Pause className="h-5 w-5 text-white" />
                      : <Play className="h-5 w-5 text-white ml-0.5" />
                    }
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-white">Recording ready</p>
                    <p className="text-xs text-slate-500">{formatTime(elapsed)} · click to preview</p>
                  </div>
                  <button
                    onClick={resetRecording}
                    className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-record
                  </button>
                </div>
                <audio ref={audioPreviewRef} className="hidden" />
              </div>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div
            className={`rounded-2xl border-2 border-dashed transition cursor-pointer mb-6 ${
              dragOver
                ? "border-amber-400 bg-amber-400/5"
                : uploadFile
                ? "border-green-500/50 bg-green-500/[0.04]"
                : "border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]"
            }`}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-10 flex flex-col items-center text-center">
              {uploadFile ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                    <span className="text-green-400 text-xl font-bold">✓</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 truncate max-w-xs">
                    {uploadFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(uploadFile.size / 1024 / 1024).toFixed(1)} MB · click to change
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">Drop your recording here</p>
                  <p className="text-xs text-slate-500">or click to browse</p>
                  <p className="text-xs text-slate-600 mt-2">MP3, WAV, M4A, MP4, MOV, WebM · any length · first 90s analysed</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Email + submit */}
        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com — results delivered here"
              className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition"
              onKeyDown={(e) => {
                if (e.key === "Enter" && hasContent) handleSubmit();
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={pageStage === "trimming" || pageStage === "submitting" || !hasContent || !email.trim()}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl py-3.5 transition"
          >
            {pageStage === "trimming" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing your recording…
              </>
            ) : pageStage === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Analyse my presentation
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-600">
            One free assessment per email · No account required · Any length · First 90s analysed
          </p>
        </div>

        {/* What you get */}
        <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-5">
            What your AI report includes
          </p>
          <div className="space-y-3">
            {DIM_NAMES.map((name, i) => (
              <div key={name} className="flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: DIM_COLORS[i] }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-[10px] text-slate-600 font-mono">{RESEARCH[i]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof / trust */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-white">207</p>
            <p className="text-[11px] text-slate-500 mt-0.5">professionals coached</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">1–3</p>
            <p className="text-[11px] text-slate-500 mt-0.5">minutes to results</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">5</p>
            <p className="text-[11px] text-slate-500 mt-0.5">research-backed dimensions</p>
          </div>
        </div>
      </div>
    </main>
  );
}
