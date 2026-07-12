"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Mic, UploadCloud, Square, RotateCcw, Loader2,
  CheckCircle2, BookmarkCheck, Tag, AlertCircle, ChevronRight, Users,
  Flag, Lightbulb, RefreshCw, Target,
} from "lucide-react";
import { Suspense } from "react";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import FreeSessionAttributionCard from "@/components/gameday/free-session-attribution-card";
import GenerateCueCardCard from "@/components/gameday/generate-cue-card-card";
import { getDimensionDisplayOrder, type LensKey } from "@/lib/gameday/feedback-lens";
import TeleprompterOverlay from "@/components/teleprompter-overlay";
import ScoreBloom, { DIM_COLORS, DIMS } from "@/components/score-bloom";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
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
  readyForScript?: boolean | null;
  suggestedOutline?: {
    throughline: string;
    sections: { type: "opening" | "insight" | "reflection" | "closing"; label: string; content: string }[];
  } | null;
}

interface Session {
  title: string;
  tags: string[];
  takeCount: number;
  status: string;
  promotedAssessmentId?: string | null;
  tier?: string;
  orgId?: string | null;
  isPublic?: boolean;
  gamedaySessionType?: string | null;
  planId?: string | null;
}

type PageStage = "loading" | "polling" | "ready" | "recording" | "recorded" | "uploading" | "promoting" | "promoted" | "error";

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

  const [locale, setLocale] = useState<"en" | "fr">("en");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().locale === "fr") setLocale("fr");
    }).catch(() => {});
  }, [user]);

  const isFr = locale === "fr";
  const maxRecordSeconds = (session?.tier === "pro" || session?.tier === "admin") ? 1200 : 300;

  const t = isFr ? {
    rehearsal: "Répétition",
    untitled: "Répétition sans titre",
    takes: (n: number) => `${n} prise${n !== 1 ? "s" : ""}`,
    takeLabel: (n: number) => `Prise ${n}`,
    analysing: (n: number) => `Analyse de la prise ${n}…`,
    analysingSubtitle: "Transcription et coaching — généralement 60–90 secondes.",
    vsLastTake: "vs dernière prise",
    takeScores: (n: number) => `Scores — Prise ${n}`,
    whatsWorking: "Ce qui fonctionne",
    coaching: "Coaching",
    nextFocus: "Focus pour votre prochaine prise",
    suggestScript: "Suggérer des améliorations du discours",
    reworkingScript: "Réécriture de votre discours…",
    scriptImprovements: "Améliorations du discours",
    yourThroughline: "Votre fil conducteur",
    draftScriptFromOutline: "Rédiger un discours complet à partir de ce plan",
    draftingScript: "Rédaction de votre discours…",
    yourDraftScript: "Votre discours préliminaire",
    notReadyPrefix: "Vous pouvez tenter une autre prise, ou — si vous préférez —",
    notReadyLink: "nous préparons un discours pour vous",
    notReadySuffix: "à partir de ce que vous avez pour l'instant.",
    fullRevisedScript: "Discours révisé complet",
    copyScript: "Copier le discours",
    copied: "Copié !",
    keepScript: "Garder mon discours",
    useAsTeleprompter: "Utiliser comme téléprompteur",
    wpm: "MPM",
    fillerWords: "Mots parasites",
    duration: "Durée",
    bestTakeSaved: "Meilleure prise sauvegardée",
    returnFromDashboard: "Vous pouvez revenir à cette session à tout moment depuis votre tableau de bord.",
    dashboard: "Tableau de bord",
    saving: "Sauvegarde…",
    saveToHistory: "Sauvegarder",
    recordTake: (n: number) => `Enregistrer la prise ${n}`,
    readyForTake: (n: number) => `Prête pour la prise ${n}`,
    record: "Enregistrer",
    upload: "Importer",
    startRecording: "Démarrer l'enregistrement",
    clickToUpload: "Cliquez pour importer",
    submitTake: (n: number) => `Soumettre la prise ${n} →`,
    stopRecording: "Arrêter l'enregistrement",
    recordingReady: (t: string) => `Enregistrement prêt — ${t}`,
    reRecord: "Recommencer",
    uploading: "Envoi en cours…",
    errorTitle: "Une erreur est survenue",
    errorFallback: "Veuillez essayer une autre prise.",
    tryAgain: "Essayer une autre prise →",
    errLoad: "Impossible de charger la répétition. Vérifiez votre connexion.",
    errDuration: "L'enregistrement dépasse la durée maximale autorisée.",
    errAnalysis: "L'analyse a échoué. Veuillez essayer une autre prise.",
    errTakesLimit: "Vous avez atteint le nombre maximum de prises sur Lite. Passez à Pro pour des prises illimitées.",
    errFileTooLarge: "Fichier trop volumineux (max 50 Mo).",
    errGeneric: "Une erreur est survenue. Veuillez réessayer.",
    errNetwork: "Erreur réseau. Veuillez réessayer.",
    errSave: "Impossible de sauvegarder la prise. Veuillez réessayer.",
    errMic: "Impossible d'accéder au microphone.",
    errFormat: "Format non supporté.",
  } : {
    rehearsal: "Rehearsal",
    untitled: "Untitled rehearsal",
    takes: (n: number) => `${n} ${n === 1 ? "take" : "takes"}`,
    takeLabel: (n: number) => `Take ${n}`,
    analysing: (n: number) => `Analysing Take ${n}…`,
    analysingSubtitle: "Transcribing and coaching — usually 60–90 seconds.",
    vsLastTake: "vs last take",
    takeScores: (n: number) => `Take ${n} scores`,
    whatsWorking: "What's working",
    coaching: "Coaching",
    nextFocus: "Focus for your next take",
    suggestScript: "Suggest script improvements",
    reworkingScript: "Reworking your script…",
    scriptImprovements: "Script improvements",
    yourThroughline: "Your throughline",
    draftScriptFromOutline: "Draft a full script from this outline",
    draftingScript: "Drafting your script…",
    yourDraftScript: "Your draft script",
    notReadyPrefix: "You can try another take, or — if you'd like —",
    notReadyLink: "we'll put a script together for you",
    notReadySuffix: "from what you've got so far.",
    fullRevisedScript: "Full revised script",
    copyScript: "Copy full script",
    copied: "Copied!",
    keepScript: "Keep my script",
    useAsTeleprompter: "Use as teleprompter",
    wpm: "WPM",
    fillerWords: "Filler words",
    duration: "Duration",
    bestTakeSaved: "Best take saved",
    returnFromDashboard: "You can return to this session any time from your dashboard.",
    dashboard: "Dashboard",
    saving: "Saving…",
    saveToHistory: "Save to history",
    recordTake: (n: number) => `Record Take ${n}`,
    readyForTake: (n: number) => `Ready for Take ${n}`,
    record: "Record",
    upload: "Upload",
    startRecording: "Start recording",
    clickToUpload: "Click to upload",
    submitTake: (n: number) => `Submit Take ${n} →`,
    stopRecording: "Stop recording",
    recordingReady: (time: string) => `Recording ready — ${time}`,
    reRecord: "Re-record",
    uploading: "Uploading…",
    errorTitle: "Something went wrong",
    errorFallback: "Please try recording another take.",
    tryAgain: "Try another take →",
    errLoad: "Could not load rehearsal. Please check your connection.",
    errDuration: "Recording exceeds the maximum duration for your plan.",
    errAnalysis: "Analysis failed. Please try another take.",
    errTakesLimit: "You've reached the maximum takes for this rehearsal on Lite. Upgrade to Pro for unlimited takes.",
    errFileTooLarge: "File too large (max 50 MB).",
    errGeneric: "Something went wrong. Please try again.",
    errNetwork: "Network error. Please try again.",
    errSave: "Could not save take. Please try again.",
    errMic: "Could not access microphone.",
    errFormat: "Unsupported format.",
  };

  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  // Set only by a promote() that just succeeded in this session — never by
  // loading an already-promoted take, so the bloom's reveal animation plays
  // exactly once, at the actual moment of achievement.
  const [justPromoted, setJustPromoted] = useState(false);

  const [scriptStage, setScriptStage] = useState<"idle" | "loading" | "ready">("idle");
  const [scriptSuggestion, setScriptSuggestion] = useState<{
    coachNote: string;
    sections: { original: string; revised: string; reason: string; dimension: string }[];
    fullRevisedScript: string;
    deliveryNote: string | null;
  } | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [useTeleprompter, setUseTeleprompter] = useState(false);

  const [outlineScriptStage, setOutlineScriptStage] = useState<"idle" | "loading" | "ready">("idle");
  const [outlineScript, setOutlineScript] = useState<{ script: string; note: string } | null>(null);

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
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rehearsal/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setPageStage("error"); return; }
      const data = await res.json();
      const loadedSession = data.session as Session;
      setSession(loadedSession);
      if (loadedSession.isPublic) setIsShared(true);
      const loadedTakes: Take[] = data.takes as Take[];
      setTakes(loadedTakes);
      return loadedTakes;
    } catch {
      setPageStage("error");
      setErrorMsg(t.errLoad);
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    loadSession().then((loadedTakes) => {
      if (!loadedTakes?.length) { setPageStage("ready"); return; }
      const active = activeTakeId
        ? loadedTakes.find((t) => t.id === activeTakeId) ?? loadedTakes[loadedTakes.length - 1]
        : loadedTakes[loadedTakes.length - 1];
      setActiveTakeId(active.id);
      if (active.status === "complete") {
        setPageStage("ready");
      } else if (active.status === "failed") {
        setPageStage("error"); setErrorMsg(t.errAnalysis);
      } else {
        setPageStage("polling");
      }
    });
  // activeTakeId intentionally omitted — including it causes an infinite loop
  // because setActiveTakeId inside the effect would re-trigger it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadSession]);

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
        setErrorMsg(data.error === "duration_exceeded" ? t.errDuration : t.errAnalysis);
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

  async function fetchScriptSuggestion() {
    if (!user || !activeTakeId) return;
    setScriptStage("loading");
    setScriptSuggestion(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/rehearsal/${sessionId}/${activeTakeId}/script-suggestion`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setScriptStage("idle"); return; }
      const data = await res.json();
      setScriptSuggestion(data);
      setScriptStage("ready");
    } catch {
      setScriptStage("idle");
    }
  }

  function dismissScriptSuggestion() {
    setScriptStage("idle");
    setScriptSuggestion(null);
    setScriptCopied(false);
  }

  async function fetchOutlineScript() {
    if (!user || !activeTakeId) return;
    setOutlineScriptStage("loading");
    setOutlineScript(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/rehearsal/${sessionId}/${activeTakeId}/outline-script`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setOutlineScriptStage("idle"); return; }
      const data = await res.json();
      setOutlineScript(data);
      setOutlineScriptStage("ready");
    } catch {
      setOutlineScriptStage("idle");
    }
  }

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
      const maxSecs = maxRecordSeconds;
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= maxSecs) { stopRecording(); return s + 1; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg(t.errMic);
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
          takes_limit_reached: t.errTakesLimit,
          file_too_large: t.errFileTooLarge,
        };
        setErrorMsg(msgs[data.error] ?? t.errGeneric);
        setPageStage("ready");
        return;
      }

      setActiveTakeId(data.takeId);
      setRecordedBlob(null);
      setUploadFile(null);
      await loadSession();
      setPageStage("polling");
    } catch {
      setErrorMsg(t.errNetwork);
      setPageStage("ready");
    }
  }

  const [shareError, setShareError] = useState("");

  async function shareToFeed() {
    if (!user || isSharing) return;
    setIsSharing(true);
    setShareError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rehearsal/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPublic: true }),
      });
      if (!res.ok) { setShareError("Failed to share. Please try again."); return; }
      setIsShared(true);
      setSession((prev) => prev ? { ...prev, isPublic: true } : prev);
    } catch { setShareError("Network error. Please try again."); }
    finally { setIsSharing(false); }
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
        setJustPromoted(true);
        setPageStage("promoted");
      } else {
        setPageStage("ready");
        setErrorMsg(t.errSave);
      }
    } catch {
      setPageStage("ready");
      setErrorMsg(t.errNetwork);
    }
  }

  const activeTake = takes.find((t) => t.id === activeTakeId);
  const isComplete = activeTake?.status === "complete";

  // Best prior take (by overall average, excluding the active one) — ghosted
  // behind the active take's bloom so beating your own best is visible as
  // the shape growing past it, not mental subtraction between two numbers.
  const personalBestScores = takes.reduce<Record<string, number> | null>((best, tk) => {
    if (!tk.scores || tk.id === activeTakeId) return best;
    const avg = Object.values(tk.scores).reduce((a, b) => a + b, 0) / 5;
    const bestAvg = best ? Object.values(best).reduce((a, b) => a + b, 0) / 5 : -1;
    return avg > bestAvg ? tk.scores : best;
  }, null);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0f1e]/95 backdrop-blur px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/dashboard")} className="text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.rehearsal}</p>
          <h1 className="text-base font-bold text-white truncate">
            {session?.title || t.untitled}
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
          {t.takes(takes.length)}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Takes timeline */}
        {takes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {takes.map((tk) => (
              <button
                key={tk.id}
                onClick={() => {
                  setActiveTakeId(tk.id);
                  setJustPromoted(false);
                  if (tk.status === "complete") setPageStage("ready");
                  else if (tk.status === "failed") setPageStage("error");
                  else setPageStage("polling");
                }}
                className={`flex-shrink-0 rounded-xl border px-4 py-3 text-left transition ${
                  tk.id === activeTakeId
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-300">{t.takeLabel(tk.takeNumber)}</span>
                  {tk.isPromoted && <BookmarkCheck className="h-3 w-3 text-green-400" />}
                  {tk.status === "complete" && !tk.isPromoted && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  )}
                  {(tk.status === "processing" || tk.status === "analyzing" || tk.status === "queued") && (
                    <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
                  )}
                </div>
                {tk.scores && (
                  <div className="flex justify-center">
                    <ScoreBloom scores={tk.scores} size={44} showNumber={false} />
                  </div>
                )}
                {tk.scores && (
                  <p className="text-xs text-slate-400 mt-1 text-center font-mono">
                    {Math.round(Object.values(tk.scores).reduce((a, b) => a + b, 0) / 5)}
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
              <p className="font-semibold text-white">{t.analysing(activeTake?.takeNumber ?? 1)}</p>
              <p className="text-sm text-slate-400 mt-1">{t.analysingSubtitle}</p>
            </div>
          </div>
        )}

        {(pageStage === "ready" || pageStage === "promoted" || pageStage === "promoting") && isComplete && activeTake && (
          <div className="space-y-5">
            {isGamedayModeEnabled() && activeTakeId && (
              <FreeSessionAttributionCard rehearsalSessionId={sessionId} takeId={activeTakeId} />
            )}

            {isGamedayModeEnabled() && session?.planId && activeTakeId && (
              <GenerateCueCardCard planId={session.planId} rehearsalSessionId={sessionId} takeId={activeTakeId} />
            )}

            {/* Comparison badge */}
            {activeTake.comparison && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{t.vsLastTake}</p>
                <p className="text-sm font-semibold text-white">{activeTake.comparison}</p>
              </div>
            )}

            {/* Score overview */}
            {activeTake.scores && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold text-slate-400 mb-4">{t.takeScores(activeTake.takeNumber)}</p>
                <div className="flex items-center gap-6 flex-wrap">
                  <ScoreBloom
                    key={activeTake.id}
                    scores={activeTake.scores}
                    size={140}
                    ghost={personalBestScores}
                    drawIn
                    celebrate={pageStage === "promoted" && justPromoted}
                  />
                  <div className="flex-1 min-w-[180px] space-y-2">
                    {(isGamedayModeEnabled() && session?.gamedaySessionType
                      ? getDimensionDisplayOrder(session.gamedaySessionType as LensKey)
                      : DIMS
                    ).map((d) => (
                      <div key={d} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-slate-300 capitalize">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: DIM_COLORS[d] }} />
                          {d}
                        </span>
                        <span className="font-semibold text-white">{activeTake.scores![d]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Coaching output — keyed by take id so switching takes replays
                the staggered reveal below; re-rendering the same take (e.g.
                unrelated state changes elsewhere on the page) does not. */}
            <div key={activeTake.id} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-5">
              {activeTake.strength && (
                <div className="coaching-line-reveal" style={{ animationDelay: "0ms" }}>
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1.5">{t.whatsWorking}</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeTake.strength}</p>
                </div>
              )}

              {activeTake.coaching && (
                <div className="coaching-line-reveal" style={{ animationDelay: "110ms" }}>
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1.5">{t.coaching}</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeTake.coaching}</p>
                </div>
              )}

              {activeTake.nextFocus && activeTake.nextFocus.length > 0 && (
                <div className="coaching-line-reveal" style={{ animationDelay: "220ms" }}>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">{t.nextFocus}</p>
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
                <p className="coaching-line-reveal text-sm text-slate-300 italic border-t border-white/10 pt-4 leading-relaxed" style={{ animationDelay: "330ms" }}>
                  &ldquo;{activeTake.encouragement}&rdquo;
                </p>
              )}

              {/* Suggested outline (triage-lite, readyForScript only) — built
                  from Chris Anderson's "throughline" + Nancy Duarte's
                  "Sparkline" (what-is / what-could-be oscillation). Replaces
                  the script-suggestion trigger at this stage entirely: there's
                  no delivered script yet to rewrite, only ideas to structure. */}
              {activeTake.suggestedOutline && (
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">{t.yourThroughline}</p>
                    <p className="text-sm text-white font-medium leading-relaxed">{activeTake.suggestedOutline.throughline}</p>
                  </div>
                  <div className="space-y-3">
                    {activeTake.suggestedOutline.sections.map((section, i) => {
                      const Icon =
                        section.type === "opening" ? Flag :
                        section.type === "insight" ? Lightbulb :
                        section.type === "reflection" ? RefreshCw :
                        Target;
                      return (
                        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{section.label}</p>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed">{section.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Draft-script action — opt-in, never automatic (handing over
                  a script the presenter didn't ask for undercuts ownership of
                  material they haven't built themselves yet). Works two ways:
                  with a ready outline it expands it into full paragraphs;
                  without one it drafts straight from the transcript and stays
                  honest about being a rough starting point. */}
              {session?.gamedaySessionType === "triage-lite" && outlineScriptStage === "idle" && (
                <div className="border-t border-white/10 pt-4">
                  {activeTake.readyForScript === false ? (
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {t.notReadyPrefix}{" "}
                      <button
                        onClick={fetchOutlineScript}
                        className="font-semibold text-violet-300 hover:text-violet-100 transition underline underline-offset-2"
                      >
                        {t.notReadyLink}
                      </button>{" "}
                      {t.notReadySuffix}
                    </p>
                  ) : activeTake.suggestedOutline ? (
                    <button
                      onClick={fetchOutlineScript}
                      className="flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-100 transition"
                    >
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t.draftScriptFromOutline}
                    </button>
                  ) : null}
                </div>
              )}

              {session?.gamedaySessionType === "triage-lite" && outlineScriptStage === "loading" && (
                <div className="border-t border-white/10 pt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.draftingScript}
                </div>
              )}

              {/* Script suggestion trigger — never shown for triage-lite:
                  when readyForScript is false the coaching text above already
                  asked for another outline pass; when true, the outline above
                  is the deliverable instead of a script rewrite. */}
              {scriptStage === "idle" && session?.gamedaySessionType !== "triage-lite" && (
                <div className="border-t border-white/10 pt-4">
                  <button
                    onClick={fetchScriptSuggestion}
                    className="flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-100 transition"
                  >
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {t.suggestScript}
                  </button>
                </div>
              )}

              {scriptStage === "loading" && (
                <div className="border-t border-white/10 pt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.reworkingScript}
                </div>
              )}
            </div>

            {/* Draft-script panel (triage-lite only) */}
            {outlineScriptStage === "ready" && outlineScript && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">{t.yourDraftScript}</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{outlineScript.note}</p>
                </div>
                <div className="rounded-xl bg-[#0a0f1e] border border-white/10 p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{outlineScript.script}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(outlineScript.script);
                      setScriptCopied(true);
                      setTimeout(() => setScriptCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition"
                  >
                    {scriptCopied ? <><span className="font-bold">✓</span> {t.copied}</> : <>{t.copyScript}</>}
                  </button>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 ml-auto cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTeleprompter}
                      onChange={(e) => setUseTeleprompter(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-amber-500"
                    />
                    {t.useAsTeleprompter}
                  </label>
                </div>
              </div>
            )}

            {/* Script suggestion panel */}
            {scriptStage === "ready" && scriptSuggestion && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">{t.scriptImprovements}</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{scriptSuggestion.coachNote}</p>
                </div>

                {scriptSuggestion.deliveryNote && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400 leading-relaxed">{scriptSuggestion.deliveryNote}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {scriptSuggestion.sections.map((s, i) => (
                    <div key={i} className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-500/70">{s.dimension}</p>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                        <p className="text-xs text-slate-500 line-through leading-relaxed">{s.original}</p>
                        <p className="text-sm text-white leading-relaxed">{s.revised}</p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-1">{s.reason}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.fullRevisedScript}</p>
                  <div className="rounded-xl bg-[#0a0f1e] border border-white/10 p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{scriptSuggestion.fullRevisedScript}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(scriptSuggestion.fullRevisedScript);
                        setScriptCopied(true);
                        setTimeout(() => setScriptCopied(false), 2000);
                      }}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition"
                    >
                      {scriptCopied ? <><span className="font-bold">✓</span> {t.copied}</> : <>{t.copyScript}</>}
                    </button>
                    <button
                      onClick={dismissScriptSuggestion}
                      className="text-sm font-medium px-4 py-2 rounded-lg border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition"
                    >
                      {t.keepScript}
                    </button>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300 ml-auto cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useTeleprompter}
                        onChange={(e) => setUseTeleprompter(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-amber-500"
                      />
                      {t.useAsTeleprompter}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Vocal stats */}
            {activeTake.wordsPerMinute && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.wpm, value: activeTake.wordsPerMinute },
                  { label: t.fillerWords, value: activeTake.fillerWordCount ?? 0 },
                  { label: t.duration, value: activeTake.audioDurationSeconds ? `${Math.round(activeTake.audioDurationSeconds)}s` : "—" },
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
              <div className="space-y-2">
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{t.bestTakeSaved}</p>
                      <p className="text-xs text-slate-400">{t.returnFromDashboard}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="text-xs font-semibold text-slate-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition flex-shrink-0"
                  >
                    {t.dashboard}
                  </button>
                </div>
                {session?.orgId && (
                  <div>
                    <button
                      onClick={shareToFeed}
                      disabled={isSharing || isShared}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        isShared
                          ? "border border-violet-500/30 bg-violet-500/10 text-violet-300 cursor-default"
                          : "border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/60 disabled:opacity-50"
                      }`}
                    >
                      {isShared ? <CheckCircle2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      {isShared ? "Shared to team feed" : isSharing ? "Sharing…" : "Share to team feed"}
                    </button>
                    {shareError && <p className="text-xs text-red-400 mt-1 text-center">{shareError}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-3">
                  {!activeTake.isPromoted && (
                    <button
                      onClick={promote}
                      disabled={pageStage === "promoting"}
                      className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
                    >
                      <BookmarkCheck className="h-4 w-4" />
                      {pageStage === "promoting" ? t.saving : t.saveToHistory}
                    </button>
                  )}
                  <button
                    onClick={() => { setRecordedBlob(null); setUploadFile(null); setInputMode("record"); setPageStage("ready"); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition"
                  >
                    <Mic className="h-4 w-4" />
                    {t.recordTake((activeTake.takeNumber ?? 1) + 1)}
                  </button>
                </div>
                {session?.orgId && activeTake.isPromoted && (
                  <button
                    onClick={shareToFeed}
                    disabled={isSharing || isShared}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isShared
                        ? "border border-violet-500/30 bg-violet-500/10 text-violet-300 cursor-default"
                        : "border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/60 disabled:opacity-50"
                    }`}
                  >
                    {isShared ? <CheckCircle2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    {isShared ? "Shared to team feed" : isSharing ? "Sharing…" : "Share to team feed"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recording / upload UI for next take */}
        {pageStage === "ready" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-300">
              {t.readyForTake((activeTake?.takeNumber ?? 0) + 1)}
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
                  {m === "record" ? t.record : t.upload}
                </button>
              ))}
            </div>

            {inputMode === "record" && pageStage === "ready" && !recordedBlob && (
              <div className="space-y-1.5">
                <button
                  onClick={startRecording}
                  className="w-full rounded-xl bg-white/10 py-3 font-semibold text-white hover:bg-white/15 transition flex items-center justify-center gap-2"
                >
                  <Mic className="h-4 w-4" />
                  {t.startRecording}
                </button>
                <p className="text-xs text-slate-600 text-center">
                  {isFr
                    ? `Jusqu'à ${Math.round(maxRecordSeconds / 60)} minutes par prise`
                    : `Up to ${Math.round(maxRecordSeconds / 60)} minutes per take`}
                </p>
              </div>
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
                    if (f.size > MAX_FILE_BYTES) { setErrorMsg(t.errFileTooLarge); return; }
                    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|mp3|wav|m4a)$/i)) {
                      setErrorMsg(t.errFormat); return;
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
                    <p className="text-sm text-slate-400">{t.clickToUpload}</p>
                  )}
                </button>
              </>
            )}

            {(recordedBlob || uploadFile) && pageStage === "ready" && (
              <button
                onClick={submitNextTake}
                className="w-full rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                {t.submitTake((activeTake?.takeNumber ?? 0) + 1)}
              </button>
            )}
          </div>
        )}

        {pageStage === "recording" && (
          <div className="space-y-4">
            {useTeleprompter && (scriptSuggestion?.fullRevisedScript || outlineScript?.script) && (
              <TeleprompterOverlay
                script={scriptSuggestion?.fullRevisedScript ?? outlineScript!.script}
                elapsedSeconds={recordingSeconds}
              />
            )}
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
                {t.stopRecording}
              </button>
            </div>
          </div>
        )}

        {pageStage === "recorded" && recordedBlob && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <p className="text-sm font-semibold text-white">{t.recordingReady(fmtTime(recordingSeconds))}</p>
            <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
            <div className="flex gap-3">
              <button
                onClick={() => { setRecordedBlob(null); setPageStage("ready"); }}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.reRecord}
              </button>
              <button
                onClick={submitNextTake}
                className="flex-1 rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                {t.submitTake((activeTake?.takeNumber ?? 0) + 1)}
              </button>
            </div>
          </div>
        )}

        {pageStage === "uploading" && (
          <div className="flex items-center justify-center gap-3 py-10">
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400">{t.uploading}</span>
          </div>
        )}

        {pageStage === "error" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">{t.errorTitle}</p>
              <p className="text-sm text-slate-400 mt-1">{errorMsg || t.errorFallback}</p>
              <button
                onClick={() => { setErrorMsg(""); setPageStage("ready"); }}
                className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition"
              >
                {t.tryAgain}
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
