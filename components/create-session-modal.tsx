"use client";

import { useState, KeyboardEvent } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { X, Copy, Check, Tag } from "lucide-react";
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
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const feedbackUrl = created
    ? `${window.location.origin}/session/${created.code}`
    : "";

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const code = generateCode();
    const ref = await addDoc(collection(db, "sessions"), {
      presenterId: user.uid,
      title: title.trim() || "Untitled session",
      code,
      tags,
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {created ? "Session ready" : "New session"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!created ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Session title (optional)</label>
              <input
                type="text"
                placeholder="e.g. Leadership Workshop — June 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Tags <span className="text-slate-600">(optional — press Enter or comma to add)</span>
              </label>
              <div className="min-h-[48px] flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-500">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs text-violet-600"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="ml-1 text-violet-600 hover:text-slate-900"
                    >×</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={tags.length === 0 ? "e.g. board, workshop, team" : ""}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-slate-400 outline-none"
                />
              </div>
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
              <QRCodeCanvas value={feedbackUrl} size={180} id="qr-modal-display" />
            </div>
            <div className="hidden">
              <QRCodeCanvas value={feedbackUrl} size={512} id="qr-modal-download" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="mb-1 text-xs text-slate-400">Session code</p>
              <p className="text-3xl font-bold tracking-widest text-white">{created.code}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-300 hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy link"}
              </button>

              <a
                href={`/sessions/${created.id}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400"
              >
                Go live →
              </a>
            </div>
            <button
              onClick={() => {
                const canvas = document.getElementById("qr-modal-download") as HTMLCanvasElement;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `learnfast-${created.code}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              Download QR (PNG)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
