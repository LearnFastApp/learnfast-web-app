"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface Props {
  onClose: () => void;
  onCreated: (sessionId: string, code: string) => void;
}

export default function CreateSessionModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const feedbackUrl = created
    ? `${window.location.origin}/session/${created.code}`
    : "";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const code = generateCode();
    const ref = await addDoc(collection(db, "sessions"), {
      presenterId: user.uid,
      title: title.trim() || "Untitled session",
      code,
      status: "active",
      createdAt: serverTimestamp(),
      expiresAt: null,
    });

    setCreated({ id: ref.id, code });
    setLoading(false);
    onCreated(ref.id, code);
  }

  function copyUrl() {
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {created ? "Session ready" : "New session"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!created ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Session title (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Leadership Workshop — June 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create session"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center rounded-xl bg-white p-6">
              <QRCodeSVG value={feedbackUrl} size={180} />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-center">
              <p className="mb-1 text-xs text-slate-400">Session code</p>
              <p className="text-3xl font-bold tracking-widest text-white">
                {created.code}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy link"}
              </button>

              <a
                href={`/sessions/${created.id}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400"
              >
                Go live →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
