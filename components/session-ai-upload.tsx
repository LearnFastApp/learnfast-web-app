"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Brain, UploadCloud, Loader2, AlertCircle, FileVideo, ChevronRight, CheckCircle } from "lucide-react";

const ACCEPTED_TYPES = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a",
];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a";
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

type Stage = "idle" | "uploading" | "processing" | "complete" | "failed";

interface Props {
  sessionId: string;
  existingAssessmentId?: string | null;
  locale?: "en" | "fr";
  onComplete: (scores: Record<string, number>, assessmentId: string) => void;
}

const STRINGS = {
  en: {
    bannerTitle: "Add AI Analysis",
    bannerDesc: "Upload your recording to get AI scores across all five dimensions",
    uploadBtn: "Upload →",
    heading: "AI Analysis",
    cancel: "Cancel",
    dropLabel: "Drop recording here or click to browse",
    dropSub: "MP4, MOV, WebM, MP3, WAV · max 500 MB",
    uploading: "Uploading…",
    analysing: "Analysing your recording…",
    analysingDesc: "AI scores will appear on the chart when ready · 1–3 minutes",
    complete: "AI Analysis complete",
    completeDesc: "View your full report — rationale, highlights, tips and vocal stats",
    failedDefault: "Analysis failed. Please try with a different file.",
    errBadType: "Unsupported file type. Use MP4, MOV, WebM, MP3 or WAV.",
    errTooLarge: "File too large — maximum 500 MB.",
    errUpgrade: "AI Analysis is available on Lite and Pro plans.",
    errMonthlyLimit: "You've used your 3 AI assessments this month. Upgrade to Pro for unlimited.",
  },
  fr: {
    bannerTitle: "Ajouter l'analyse IA",
    bannerDesc: "Téléchargez votre enregistrement pour obtenir des scores IA sur les cinq dimensions",
    uploadBtn: "Télécharger →",
    heading: "Analyse IA",
    cancel: "Annuler",
    dropLabel: "Déposez votre enregistrement ici ou cliquez pour parcourir",
    dropSub: "MP4, MOV, WebM, MP3, WAV · max 500 Mo",
    uploading: "Téléchargement…",
    analysing: "Analyse de votre enregistrement…",
    analysingDesc: "Les scores IA apparaîtront sur le graphique dès que prêts · 1–3 minutes",
    complete: "Analyse IA terminée",
    completeDesc: "Voir votre rapport complet — justifications, points clés, conseils et statistiques vocales",
    failedDefault: "Échec de l'analyse. Veuillez réessayer avec un autre fichier.",
    errBadType: "Format non supporté. Utilisez MP4, MOV, WebM, MP3 ou WAV.",
    errTooLarge: "Fichier trop volumineux — maximum 500 Mo.",
    errUpgrade: "L'analyse IA est disponible sur les abonnements Lite et Pro.",
    errMonthlyLimit: "Vous avez utilisé vos 3 analyses IA ce mois-ci. Passez à Pro pour un accès illimité.",
  },
};

export default function SessionAiUpload({ sessionId, existingAssessmentId, locale = "en", onComplete }: Props) {
  const s = STRINGS[locale];
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState<Stage>(existingAssessmentId ? "processing" : "idle");
  const [showZone, setShowZone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [assessmentId, setAssessmentId] = useState<string | null>(existingAssessmentId ?? null);

  // Poll until complete
  useEffect(() => {
    if (!assessmentId || !user) return;
    if (stage === "complete" || stage === "failed") return;

    async function poll() {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/ai-assessment/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "complete" && data.scores) {
        setStage("complete");
        onComplete(data.scores, assessmentId!);
      } else if (data.status === "failed") {
        setStage("failed");
        setErrorMsg(s.failedDefault);
      } else {
        pollRef.current = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [assessmentId, user, stage, onComplete]);

  const handleFile = useCallback(async (file: File) => {
    if (!user) return;

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|mkv|mp3|wav|m4a)$/i)) {
      setErrorMsg(s.errBadType);
      setStage("failed");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(s.errTooLarge);
      setStage("failed");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    const token = await user.getIdToken();
    const path = `ai-recordings/${user.uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileRef = storageRef(storage, path);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type || "video/mp4" });

    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        setErrorMsg(`Upload failed (${err.code})`);
        setStage("failed");
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          const res = await fetch("/api/ai-assessment", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ downloadUrl, fileName: file.name, storagePath: path, sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msgs: Record<string, string> = {
              upgrade_required: s.errUpgrade,
              monthly_limit: s.errMonthlyLimit,
            };
            setErrorMsg(msgs[data.error] ?? `Error ${res.status}: ${data.error ?? "Something went wrong."}`);
            setStage("failed");
            return;
          }
          setAssessmentId(data.assessmentId);
          setStage("processing");
        } catch (err) {
          setErrorMsg(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
          setStage("failed");
        }
      }
    );
  }, [user, sessionId]);

  // CTA banner — collapsed
  if ((stage === "idle" || stage === "failed") && !showZone) {
    return (
      <div className="mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">{s.bannerTitle}</p>
            <p className="text-xs text-slate-400">{s.bannerDesc}</p>
          </div>
        </div>
        <button
          onClick={() => { setStage("idle"); setShowZone(true); }}
          className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition"
        >
          {s.uploadBtn}
        </button>
      </div>
    );
  }

  // Upload zone — expanded
  if ((stage === "idle" || stage === "failed") && showZone) {
    return (
      <div className="mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-[#111827] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold text-white">{s.heading}</p>
          <button onClick={() => { setShowZone(false); setStage("idle"); setErrorMsg(""); }} className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition">{s.cancel}</button>
        </div>

        {stage === "failed" && errorMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{errorMsg}</p>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.03] cursor-pointer transition p-8 text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXT}
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <UploadCloud className="h-6 w-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-300 font-semibold mb-1">{s.dropLabel}</p>
          <p className="text-xs text-slate-500">{s.dropSub}</p>
        </div>
      </div>
    );
  }

  // Uploading
  if (stage === "uploading") {
    return (
      <div className="mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-[#111827] p-5">
        <div className="flex items-center gap-3 mb-4">
          <FileVideo className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{s.uploading}</p>
            <p className="text-xs text-slate-500">{uploadProgress}%</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      </div>
    );
  }

  // Processing
  if (stage === "processing") {
    return (
      <div className="mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-amber-400 shrink-0 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-white">{s.analysing}</p>
          <p className="text-xs text-slate-400">{s.analysingDesc}</p>
        </div>
      </div>
    );
  }

  // Complete — persistent link to full report
  return (
    <a
      href={`/ai-assessment/${assessmentId}`}
      className="mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4 flex items-center justify-between gap-4 hover:bg-amber-500/10 transition group"
    >
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">{s.complete}</p>
          <p className="text-xs text-slate-400">{s.completeDesc}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}
