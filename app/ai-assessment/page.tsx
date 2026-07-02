"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { UploadCloud, FileVideo, Loader2, AlertCircle, Brain } from "lucide-react";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a";
const MAX_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60 * 60; // 60 minutes

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

type Stage = "idle" | "uploading" | "submitted" | "error";

const STRINGS = {
  en: {
    navBack: "← Dashboard",
    navTitle: "AI Analysis",
    heading: "Analyse your presentation",
    subheading: "Upload a recording and get AI-powered scores across all five dimensions — Clarity, Energy, Engagement, Understanding and Connection.",
    dropLabel: "Drop your recording here",
    dropSub: "or click to browse",
    dropFormats: "MP4, MOV, WebM, MP3, WAV · max 60 min · max 500 MB",
    uploading: "Uploading…",
    analysing: "Analysing your presentation…",
    analysingDesc: "Shorter recordings take 1–3 minutes. Longer files (20+ minutes) may take up to 10 minutes. You can leave this page — your results will be ready in your dashboard.",
    planNote: "3 assessments per month on Lite · Unlimited on Pro",
    errUpgrade: "AI Analysis is available on Lite and Pro plans.",
    errLimit: "You've used your 3 AI assessments for this month. Upgrade to Pro for unlimited access.",
  },
  fr: {
    navBack: "← Tableau de bord",
    navTitle: "Analyse IA",
    heading: "Analysez votre présentation",
    subheading: "Téléchargez un enregistrement et obtenez des scores IA sur les cinq dimensions — Clarté, Énergie, Engagement, Compréhension et Connexion.",
    dropLabel: "Déposez votre enregistrement ici",
    dropSub: "ou cliquez pour parcourir",
    dropFormats: "MP4, MOV, WebM, MP3, WAV · max 60 min · max 500 Mo",
    uploading: "Téléchargement…",
    analysing: "Analyse de votre présentation…",
    analysingDesc: "Les enregistrements courts prennent 1–3 minutes. Les fichiers longs (20+ minutes) peuvent prendre jusqu'à 10 minutes. Vous pouvez quitter cette page — vos résultats seront disponibles dans votre tableau de bord.",
    planNote: "3 analyses par mois sur Lite · Illimité sur Pro",
    errUpgrade: "L'analyse IA est disponible sur les abonnements Lite et Pro.",
    errLimit: "Vous avez utilisé vos 3 analyses IA ce mois-ci. Passez à Pro pour un accès illimité.",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [locale, setLocale] = useState<"en" | "fr">("en");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().locale === "fr") setLocale("fr");
    }).catch(() => {});
  }, [user]);

  // Prevent the browser from navigating to the file if the user misses the drop zone
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, []);

  const s = STRINGS[locale];
  const dims = DIM_LABELS[locale];

  const handleFile = useCallback(async (file: File) => {
    if (!user) return;

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|mkv|mp3|wav|m4a)$/i)) {
      setErrorMsg(locale === "fr" ? "Format non supporté. Utilisez MP4, MOV, WebM, MP3 ou WAV." : "Unsupported file type. Please upload an MP4, MOV, WebM, MP3 or WAV file.");
      setStage("error");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(locale === "fr" ? "Fichier trop volumineux — maximum 500 Mo." : "File is too large. Maximum size is 500 MB.");
      setStage("error");
      return;
    }

    const duration = await checkDuration(file);
    if (duration > MAX_DURATION_SECONDS) {
      setErrorMsg(
        locale === "fr"
          ? "Enregistrement trop long — maximum 60 minutes. Découpez votre fichier et réessayez."
          : "Recording is too long — maximum 60 minutes. Please trim your file and try again."
      );
      setStage("error");
      return;
    }

    setStage("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    const token = await user.getIdToken();
    const path = `ai-recordings/${user.uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileRef = storageRef(storage, path);
    const contentType = file.type || "video/mp4";
    const task = uploadBytesResumable(fileRef, file, { contentType });

    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error("[ai-assessment] storage error:", err.code, err.message);
        setErrorMsg(locale === "fr" ? `Échec du téléchargement (${err.code ?? "storage-error"}).` : `Upload failed (${err.code ?? "storage-error"}). Please try again.`);
        setStage("error");
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          const res = await fetch("/api/ai-assessment", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ downloadUrl, fileName: file.name, storagePath: path }),
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
          setErrorMsg(locale === "fr" ? `Erreur inattendue : ${err instanceof Error ? err.message : String(err)}` : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
          setStage("error");
        }
      }
    );
  }, [user, router, locale, s]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

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
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <Brain className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{s.heading}</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">{s.subheading}</p>
        </div>

        {stage === "error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {(stage === "idle" || stage === "error") && (
          <div
            className={`relative rounded-2xl border-2 border-dashed transition cursor-pointer ${dragOver ? "border-amber-400 bg-amber-400/5" : "border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.06]"}`}
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

        {stage === "uploading" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-8">
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

        {stage === "submitted" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-white">{s.analysing}</p>
            <p className="text-xs text-slate-500 mt-2">{s.analysingDesc}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4">
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
