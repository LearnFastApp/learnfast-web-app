"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  AlertCircle, Brain, FileVideo, Loader2, Mic, Pause,
  Play, RotateCcw, Square, Upload, UploadCloud,
} from "lucide-react";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a";
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_UPLOAD_DURATION = 60 * 60; // 60 minutes for file uploads
const MAX_RECORD_SECONDS = 10 * 60;  // 10 minutes for live recording

async function checkDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const cleanup = (value: number) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => cleanup(0), 4000);
    audio.addEventListener("loadedmetadata", () => cleanup(audio.duration));
    audio.addEventListener("error", () => cleanup(0));
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

type Tab = "upload" | "record";
type RecordStage = "idle" | "requesting" | "recording" | "preview";
type Stage = "idle" | "uploading" | "submitted" | "error";

const STRINGS = {
  en: {
    navBack: "← Dashboard",
    navTitle: "AI Analysis",
    heading: "Analyse your presentation",
    subheading: "Record live or upload a file — get AI-powered scores across all five dimensions.",
    tabRecord: "Record",
    tabUpload: "Upload file",
    recordIdle: "Click to start recording",
    recordIdleSub: "Microphone audio · max 10 minutes",
    recordRequesting: "Requesting microphone access…",
    recordAutoStop: "auto-stops at",
    recordStopHint: "Click to stop ·",
    recordReady: "Recording ready",
    recordPreviewHint: "click to preview",
    reRecord: "Re-record",
    dropLabel: "Drop your recording here",
    dropSub: "or click to browse",
    dropFormats: "MP4, MOV, WebM, MP3, WAV · max 60 min · max 2 GB",
    uploading: "Uploading…",
    analysing: "Analysing your presentation…",
    analysingDesc: "Shorter recordings take 1–3 minutes. Longer files (20+ minutes) may take up to 10 minutes. You can leave this page — your results will be ready in your dashboard.",
    analyseBtn: "Analyse my presentation",
    planNote: "3 assessments per month on Lite · Unlimited on Pro",
    errUpgrade: "AI Analysis is available on Lite and Pro plans.",
    errLimit: "You've used your 3 AI assessments for this month. Upgrade to Pro for unlimited access.",
    errMic: "Microphone access was denied. Please allow microphone access and try again.",
  },
  fr: {
    navBack: "← Tableau de bord",
    navTitle: "Analyse IA",
    heading: "Analysez votre présentation",
    subheading: "Enregistrez en direct ou téléchargez un fichier — obtenez des scores IA sur les cinq dimensions.",
    tabRecord: "Enregistrer",
    tabUpload: "Télécharger un fichier",
    recordIdle: "Cliquez pour commencer l'enregistrement",
    recordIdleSub: "Audio microphone · max 10 minutes",
    recordRequesting: "Demande d'accès au microphone…",
    recordAutoStop: "arrêt auto à",
    recordStopHint: "Cliquez pour arrêter ·",
    recordReady: "Enregistrement prêt",
    recordPreviewHint: "cliquez pour écouter",
    reRecord: "Re-enregistrer",
    dropLabel: "Déposez votre enregistrement ici",
    dropSub: "ou cliquez pour parcourir",
    dropFormats: "MP4, MOV, WebM, MP3, WAV · max 60 min · max 2 Go",
    uploading: "Téléchargement…",
    analysing: "Analyse de votre présentation…",
    analysingDesc: "Les enregistrements courts prennent 1–3 minutes. Les fichiers longs (20+ minutes) peuvent prendre jusqu'à 10 minutes. Vous pouvez quitter cette page — vos résultats seront disponibles dans votre tableau de bord.",
    analyseBtn: "Analyser ma présentation",
    planNote: "3 analyses par mois sur Lite · Illimité sur Pro",
    errUpgrade: "L'analyse IA est disponible sur les abonnements Lite et Pro.",
    errLimit: "Vous avez utilisé vos 3 analyses IA ce mois-ci. Passez à Pro pour un accès illimité.",
    errMic: "Accès au microphone refusé. Veuillez autoriser l'accès au microphone et réessayer.",
  },
};

const DIM_LABELS = {
  en: ["Clarity", "Energy", "Engagement", "Understanding", "Connection"],
  fr: ["Clarté", "Énergie", "Engagement", "Compréhension", "Connexion"],
};
const DIM_COLORS = ["#8b5cf6", "#f59e0b", "#22d3ee", "#34d399", "#f472b6"];

export default function AiAssessmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [locale, setLocale] = useState<"en" | "fr">("en");

  // Tab
  const [tab, setTab] = useState<Tab>("record");

  // Upload tab
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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

  // Submission
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().locale === "fr") setLocale("fr");
    }).catch(() => {});
  }, [user]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const s = STRINGS[locale];
  const dims = DIM_LABELS[locale];

  // ── Core upload-to-Firebase-Storage logic (shared by upload + record) ────────
  const submitBlob = useCallback(async (blob: Blob, fileName: string) => {
    if (!user) return;
    setStage("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    const token = await user.getIdToken();
    const path = `ai-recordings/${user.uid}/${Date.now()}-${fileName}`;
    const fileRef = storageRef(storage, path);
    const contentType = blob.type || "audio/webm";
    const task = uploadBytesResumable(fileRef, blob, { contentType });

    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error("[ai-assessment] storage error:", err.code, err.message);
        setErrorMsg(locale === "fr"
          ? `Échec du téléchargement (${err.code ?? "storage-error"}).`
          : `Upload failed (${err.code ?? "storage-error"}). Please try again.`);
        setStage("error");
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          const res = await fetch("/api/ai-assessment", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ downloadUrl, fileName, storagePath: path }),
          });
          let data: Record<string, string> = {};
          try { data = await res.json(); } catch { /* non-JSON */ }
          if (!res.ok) {
            const msgs: Record<string, string> = {
              upgrade_required: s.errUpgrade,
              monthly_limit: s.errLimit,
            };
            setErrorMsg(msgs[data.error] ?? `Error ${res.status}: ${data.error ?? (locale === "fr" ? "Échec de l'appel API." : "API call failed.")}`);
            setStage("error");
            return;
          }
          setStage("submitted");
          router.push(`/ai-assessment/${data.assessmentId}`);
        } catch (err) {
          console.error("[ai-assessment] submit error:", err);
          setErrorMsg(locale === "fr"
            ? `Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`
            : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
          setStage("error");
        }
      }
    );
  }, [user, router, locale, s]);

  // ── Upload tab ───────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!user) return;
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|mkv|mp3|wav|m4a)$/i)) {
      setErrorMsg(locale === "fr" ? "Format non supporté. Utilisez MP4, MOV, WebM, MP3 ou WAV." : "Unsupported file type. Please upload an MP4, MOV, WebM, MP3 or WAV file.");
      setStage("error");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(locale === "fr" ? "Fichier trop volumineux — maximum 2 Go." : "File is too large. Maximum size is 2 GB.");
      setStage("error");
      return;
    }
    const duration = await checkDuration(file);
    if (duration > MAX_UPLOAD_DURATION) {
      setErrorMsg(locale === "fr"
        ? "Enregistrement trop long — maximum 60 minutes. Découpez votre fichier et réessayez."
        : "Recording is too long — maximum 60 minutes. Please trim your file and try again.");
      setStage("error");
      return;
    }
    await submitBlob(file, file.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
  }, [user, locale, submitBlob]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  // ── Record tab ───────────────────────────────────────────────────────────────
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      autoStopRef.current = setTimeout(stopRecording, MAX_RECORD_SECONDS * 1000);
    } catch {
      setRecordStage("idle");
      setErrorMsg(s.errMic);
      setStage("error");
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

  async function handleAnalyse() {
    if (tab === "record" && recordedBlob) {
      await submitBlob(recordedBlob, `recording-${Date.now()}.webm`);
    }
  }

  const canAnalyse = tab === "record" && recordStage === "preview" && !!recordedBlob;

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">{s.navBack}</a>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">{s.navTitle}</span>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <Brain className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{s.heading}</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">{s.subheading}</p>
        </div>

        {/* Error banner */}
        {stage === "error" && errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {/* Tabs — only shown when idle/error */}
        {(stage === "idle" || stage === "error") && (
          <>
            <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-6">
              <button
                onClick={() => { setTab("record"); setStage("idle"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === "record" ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Mic className="h-4 w-4" />
                {s.tabRecord}
              </button>
              <button
                onClick={() => { setTab("upload"); resetRecording(); setStage("idle"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === "upload" ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Upload className="h-4 w-4" />
                {s.tabUpload}
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
                    <p className="text-white font-semibold mb-1">{s.recordIdle}</p>
                    <p className="text-slate-500 text-sm">{s.recordIdleSub}</p>
                  </div>
                )}

                {recordStage === "requesting" && (
                  <div className="p-10 flex flex-col items-center text-center">
                    <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
                    <p className="text-slate-300 text-sm">{s.recordRequesting}</p>
                  </div>
                )}

                {recordStage === "recording" && (
                  <div className="p-10 flex flex-col items-center text-center">
                    <div className="relative mb-5">
                      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                      <button
                        onClick={stopRecording}
                        className="relative w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30 transition flex items-center justify-center"
                      >
                        <Square className="h-7 w-7 text-red-400 fill-red-400" />
                      </button>
                    </div>
                    <p className="text-white font-bold text-2xl font-mono mb-1">{formatTime(elapsed)}</p>
                    <p className="text-slate-500 text-sm">
                      {s.recordStopHint} {s.recordAutoStop} {formatTime(MAX_RECORD_SECONDS)}
                    </p>
                    <div className="mt-4 w-full max-w-xs bg-white/[0.04] rounded-full h-1.5">
                      <div
                        className="bg-red-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min((elapsed / MAX_RECORD_SECONDS) * 100, 100)}%` }}
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
                          : <Play className="h-5 w-5 text-white ml-0.5" />}
                      </button>
                      <div>
                        <p className="text-sm font-semibold text-white">{s.recordReady}</p>
                        <p className="text-xs text-slate-500">{formatTime(elapsed)} · {s.recordPreviewHint}</p>
                      </div>
                      <button
                        onClick={resetRecording}
                        className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {s.reRecord}
                      </button>
                    </div>
                    <audio ref={audioPreviewRef} className="hidden" />
                    <button
                      onClick={handleAnalyse}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl py-3.5 transition"
                    >
                      <Brain className="h-4 w-4" />
                      {s.analyseBtn}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload tab */}
            {tab === "upload" && (
              <div
                className={`relative rounded-2xl border-2 border-dashed transition cursor-pointer mb-6 ${
                  dragOver ? "border-amber-400 bg-amber-400/5" : "border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.06]"
                }`}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept={ACCEPTED_EXT} className="sr-only" onChange={onInputChange} />
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center pointer-events-none">
                  <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-white/5">
                    <UploadCloud className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{s.dropLabel}</p>
                  <p className="text-xs text-slate-500">{s.dropSub}</p>
                  <p className="mt-4 text-[11px] text-slate-600">{s.dropFormats}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Uploading */}
        {stage === "uploading" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
                <FileVideo className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{s.uploading}</p>
                <p className="text-xs text-slate-500 mt-0.5">{uploadProgress}%</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Processing */}
        {stage === "submitted" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 text-center mb-6">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-white">{s.analysing}</p>
            <p className="text-xs text-slate-500 mt-2">{s.analysingDesc}</p>
          </div>
        )}

        {/* Dimension chips */}
        <div className="mt-2 grid grid-cols-3 gap-4">
          {dims.map((label, i) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: DIM_COLORS[i] }} />
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-3 text-center">
            <p className="text-[11px] text-slate-500">{s.planNote}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
