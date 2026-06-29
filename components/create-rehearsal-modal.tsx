"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Mic, UploadCloud, Tag, Square, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const ACCEPTED_TYPES = ["video/mp4","video/quicktime","video/webm","audio/mpeg","audio/wav","audio/mp4","audio/x-m4a","audio/webm"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_RECORD_SECONDS = 300; // 5 min for rehearsal (more generous than guest)

interface Props {
  onClose: () => void;
  locale?: "en" | "fr";
}

type Tab = "record" | "upload";
type Stage = "setup" | "recording" | "preview" | "submitting";

export default function CreateRehearsalModal({ onClose, locale = "en" }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const isFr = locale === "fr";

  const [tab, setTab] = useState<Tab>("record");
  const [stage, setStage] = useState<Stage>("setup");
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { timerRef.current && clearInterval(timerRef.current); }, []);

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags((p) => [...p, tag]);
    setTagInput("");
  }
  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length) setTags((p) => p.slice(0, -1));
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setStage("preview");
      };
      mr.start(250);
      mediaRef.current = mr;
      setRecordingSeconds(0);
      setStage("recording");
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) { stopRecording(); return s + 1; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg(isFr ? "Microphone inaccessible." : "Could not access microphone.");
    }
  }

  function stopRecording() {
    timerRef.current && clearInterval(timerRef.current);
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  }

  function reRecord() {
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setStage("setup");
  }

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  async function handleSubmit() {
    if (!user) return;
    const blob = tab === "record" ? recordedBlob : uploadFile;
    if (!blob) return;

    setStage("submitting");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("tags", JSON.stringify(tags));
      formData.append("file", blob, tab === "record" ? "rehearsal.webm" : (uploadFile as File).name);

      const res = await fetch("/api/rehearsal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msgs: Record<string, string> = {
          upgrade_required: isFr ? "Passez à Lite pour accéder aux répétitions." : "Upgrade to Lite to access Rehearsal Mode.",
          monthly_limit: isFr ? "Limite mensuelle atteinte." : "Monthly rehearsal limit reached. Upgrade to Pro for unlimited access.",
          file_too_large: isFr ? "Fichier trop volumineux (max 50 Mo)." : "File too large (max 50 MB).",
        };
        setErrorMsg(msgs[data.error] ?? (isFr ? "Une erreur est survenue." : "Something went wrong. Please try again."));
        setStage("setup");
        return;
      }

      router.push(`/rehearse/${data.sessionId}?takeId=${data.takeId}`);
      onClose();
    } catch {
      setErrorMsg(isFr ? "Erreur réseau." : "Network error. Please try again.");
      setStage("setup");
    }
  }

  const canSubmit = stage !== "submitting" && (
    (tab === "record" && recordedBlob) ||
    (tab === "upload" && uploadFile)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isFr ? "Nouvelle répétition" : "New Rehearsal"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {isFr ? "Entraînez-vous et progressez take par take." : "Practise and improve take by take."}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-5">
          {/* Title + Tags */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              {isFr ? "Titre (facultatif)" : "Title (optional)"}
            </label>
            <input
              type="text"
              placeholder={isFr ? "ex. Discours d'ouverture — Conférence juin" : "e.g. Opening talk — June conference"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              {isFr ? "Tags (facultatif)" : "Tags (optional)"}
            </label>
            <div className="min-h-[44px] flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#1a2135] px-3 py-2 focus-within:border-violet-500">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-1 text-xs text-violet-300">
                  <Tag className="h-3 w-3" />{t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="ml-1 text-violet-400 hover:text-white">×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tags.length === 0 ? (isFr ? "ex. conseil, atelier" : "e.g. board, workshop") : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={addTag}
                className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            {(["record", "upload"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setStage("setup"); setRecordedBlob(null); setUploadFile(null); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === t ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "record" ? <Mic className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                {t === "record" ? (isFr ? "Enregistrer" : "Record") : (isFr ? "Importer" : "Upload")}
              </button>
            ))}
          </div>

          {/* Record tab */}
          {tab === "record" && (
            <div className="rounded-xl border border-white/10 bg-[#1a2135] p-6 text-center space-y-4">
              {stage === "setup" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
                    <Mic className="h-7 w-7 text-violet-400" />
                  </div>
                  <p className="text-sm text-slate-400">
                    {isFr ? "Jusqu'à 5 minutes d'enregistrement." : "Up to 5 minutes per take."}
                  </p>
                  <button
                    onClick={startRecording}
                    className="w-full rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-400 transition"
                  >
                    {isFr ? "Démarrer l'enregistrement" : "Start recording"}
                  </button>
                </>
              )}

              {stage === "recording" && (
                <>
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center">
                      <Mic className="h-7 w-7 text-red-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-mono font-bold text-white">{fmtTime(recordingSeconds)}</p>
                  <button
                    onClick={stopRecording}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 py-3 font-semibold text-red-400 hover:bg-red-500/30 transition"
                  >
                    <Square className="h-4 w-4" />
                    {isFr ? "Arrêter l'enregistrement" : "Stop recording"}
                  </button>
                </>
              )}

              {stage === "preview" && recordedBlob && (
                <>
                  <p className="text-sm font-semibold text-white">
                    {isFr ? `Enregistrement prêt — ${fmtTime(recordingSeconds)}` : `Recording ready — ${fmtTime(recordingSeconds)}`}
                  </p>
                  <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                  <button
                    onClick={reRecord}
                    className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition mx-auto"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isFr ? "Recommencer" : "Re-record"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.webm,.mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_SIZE_BYTES) { setErrorMsg(isFr ? "Fichier trop volumineux (max 50 Mo)." : "File too large (max 50 MB)."); return; }
                  if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|mp3|wav|m4a)$/i)) {
                    setErrorMsg(isFr ? "Format non supporté." : "Unsupported format."); return;
                  }
                  setUploadFile(f);
                  setErrorMsg("");
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-white/20 bg-[#1a2135] p-8 text-center hover:border-violet-500/50 transition"
              >
                {uploadFile ? (
                  <div className="space-y-1">
                    <span className="text-green-400 text-xl font-bold">✓</span>
                    <p className="text-sm font-semibold text-white truncate">{uploadFile.name}</p>
                    <p className="text-xs text-slate-500">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="h-8 w-8 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-400">{isFr ? "Cliquez pour choisir un fichier" : "Click to choose a file"}</p>
                    <p className="text-xs text-slate-600">MP4 · MOV · WebM · MP3 · WAV · max 50 MB</p>
                  </div>
                )}
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-red-400 text-center">{errorMsg}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-violet-500 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {stage === "submitting"
              ? (isFr ? "Envoi en cours…" : "Submitting…")
              : (isFr ? "Démarrer la répétition →" : "Start rehearsal →")}
          </button>
        </div>
      </div>
    </div>
  );
}
