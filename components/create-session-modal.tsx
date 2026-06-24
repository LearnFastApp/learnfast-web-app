"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { collection, getDocs, updateDoc, doc, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { X, Copy, Check, Tag } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface PendingCommitment {
  sessionId: string;
  sessionTitle: string;
  dimension: string;
  text: string;
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
  const [qrCopied, setQrCopied] = useState(false);
  const [qrCopyFailed, setQrCopyFailed] = useState(false);

  const [pendingCommitment, setPendingCommitment] = useState<PendingCommitment | null>(null);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInDone, setCheckInDone] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(query(
      collection(db, "sessions"),
      where("presenterId", "==", user.uid),
      where("status", "==", "closed"),
      orderBy("createdAt", "desc"),
      limit(5)
    )).then((snap) => {
      for (const d of snap.docs) {
        const data = d.data();
        if (data.commitment && !data.commitmentReview) {
          setPendingCommitment({
            sessionId: d.id,
            sessionTitle: data.title || "Untitled session",
            dimension: data.commitment.dimension,
            text: data.commitment.text,
          });
          break;
        }
      }
    });
  }, [user]);

  async function submitCheckIn(skip = false) {
    if (!pendingCommitment) return;
    setCheckInSaving(true);
    await updateDoc(doc(db, "sessions", pendingCommitment.sessionId), {
      commitmentReview: {
        notes: skip ? "" : checkInNotes.trim(),
        skipped: skip,
        appliedAt: serverTimestamp(),
      },
    });
    setCheckInSaving(false);
    setCheckInDone(true);
  }

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

    const token = await user.getIdToken();
    const res = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: title.trim(), tags }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      // free_tier_limit is handled by the dashboard gating, but handle gracefully here too
      console.error("[create-session]", data.error);
      return;
    }

    setCreated({ id: data.sessionId, code: data.code });
    onCreated(data.sessionId, data.code);
  }

  function copyUrl() {
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showCheckIn = pendingCommitment && !checkInDone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {showCheckIn ? "Before you start" : created ? "Session ready" : "New session"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {showCheckIn ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                Last session — {pendingCommitment.dimension}
              </p>
              <p className="text-sm text-white leading-relaxed">&ldquo;{pendingCommitment.text}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">from {pendingCommitment.sessionTitle}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300 font-medium">How did it go?</label>
              <textarea
                autoFocus
                rows={4}
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="e.g. I practised the opening twice before the session — felt much more natural. Still lost flow when Q&A started…"
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 resize-none"
              />
            </div>
            <button
              onClick={() => submitCheckIn(false)}
              disabled={!checkInNotes.trim() || checkInSaving}
              className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              {checkInSaving ? "Saving…" : "Save reflection & continue →"}
            </button>
            <button
              onClick={() => submitCheckIn(true)}
              disabled={checkInSaving}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Skip for now
            </button>
          </div>
        ) : !created ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Session title (optional)</label>
              <input
                type="text"
                placeholder="e.g. Leadership Workshop — June 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Tags <span className="text-slate-600">(optional — press Enter or comma to add)</span>
              </label>
              <div className="min-h-[48px] flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#1a2135] px-3 py-2 focus-within:border-violet-500">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-1 text-xs text-violet-300"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="ml-1 text-violet-400 hover:text-white"
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
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-slate-600 outline-none"
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
              <QRCodeCanvas value={feedbackUrl} size={1024} id="qr-modal-download" />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-center">
              <p className="mb-1 text-xs text-slate-400">Session code</p>
              <p className="text-3xl font-bold tracking-widest text-white">{created.code}</p>
            </div>

            <button
              onClick={async () => {
                const canvas = document.getElementById("qr-modal-download") as HTMLCanvasElement;
                if (!canvas) return;
                setQrCopyFailed(false);
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      "image/png": new Promise<Blob>((resolve, reject) =>
                        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("no blob")), "image/png")
                      ),
                    }),
                  ]);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                } catch {
                  setQrCopyFailed(true);
                  setTimeout(() => setQrCopyFailed(false), 3000);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              {qrCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {qrCopied ? "QR image copied!" : qrCopyFailed ? "Copy not supported — use Download" : "Copy QR image"}
            </button>
            <button
              onClick={() => {
                const canvas = document.getElementById("qr-modal-download") as HTMLCanvasElement;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `learnfast-${created.code}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
            >
              Download QR (PNG)
            </button>
            <div className="flex gap-3">
              <button
                onClick={copyUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy link"}
              </button>

              <a
                href={`/sessions/${created.id}`}
                className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
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
