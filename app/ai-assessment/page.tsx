"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { UploadCloud, FileVideo, Loader2, AlertCircle, Brain } from "lucide-react";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a";
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

type Stage = "idle" | "uploading" | "submitted" | "error";

export default function AiAssessmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!user) return;

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|mkv|mp3|wav|m4a)$/i)) {
      setErrorMsg("Unsupported file type. Please upload an MP4, MOV, WebM, MP3 or WAV file.");
      setStage("error");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg("File is too large. Maximum size is 500 MB.");
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
        console.error("[ai-assessment] upload error:", err);
        setErrorMsg("Upload failed. Please try again.");
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
          const data = await res.json();
          if (!res.ok) {
            const msgs: Record<string, string> = {
              upgrade_required: "AI Analysis is available on Lite and Pro plans.",
              monthly_limit: "You've used your 3 AI assessments for this month. Upgrade to Pro for unlimited access.",
            };
            setErrorMsg(msgs[data.error] ?? "Something went wrong. Please try again.");
            setStage("error");
            return;
          }
          setStage("submitted");
          router.push(`/ai-assessment/${data.assessmentId}`);
        } catch (err) {
          console.error("[ai-assessment] submit error:", err);
          setErrorMsg("Something went wrong. Please try again.");
          setStage("error");
        }
      }
    );
  }, [user, router]);

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

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">← Dashboard</a>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">AI Analysis</span>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <Brain className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Analyse your presentation</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Upload a recording and get AI-powered scores across all five dimensions — Clarity, Energy, Engagement, Understanding and Connection.
          </p>
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
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="sr-only"
              onChange={onInputChange}
            />
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center pointer-events-none">
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-white/5">
                <UploadCloud className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Drop your recording here</p>
              <p className="text-xs text-slate-500">or click to browse</p>
              <p className="mt-4 text-[11px] text-slate-600">MP4, MOV, WebM, MP3, WAV · max 500 MB</p>
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
                <p className="text-sm font-semibold text-white">Uploading…</p>
                <p className="text-xs text-slate-500 mt-0.5">{uploadProgress}% complete</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "submitted" && (
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-white">Analysing your presentation…</p>
            <p className="text-xs text-slate-500 mt-2">This usually takes 1–3 minutes. Redirecting now.</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Clarity", color: "#8b5cf6" },
            { label: "Energy", color: "#f59e0b" },
            { label: "Engagement", color: "#22d3ee" },
            { label: "Understanding", color: "#34d399" },
            { label: "Connection", color: "#f472b6" },
          ].map((dim) => (
            <div key={dim.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: dim.color }} />
              <p className="text-[11px] text-slate-400">{dim.label}</p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-3 text-center">
            <p className="text-[11px] text-slate-500">3 assessments per month on Lite · Unlimited on Pro</p>
          </div>
        </div>
      </div>
    </main>
  );
}
