"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  BookOpen, Eye, EyeOff, FileText, Link2, Loader2,
  Plus, Trash2, Video, X,
} from "lucide-react";
import type { LibraryContent, LibraryDimension, LibraryContentType } from "@/types/enterprise";

const DIMENSIONS: { value: LibraryDimension; label: string }[] = [
  { value: "clarity", label: "Clarity" },
  { value: "engagement", label: "Engagement" },
  { value: "energy", label: "Energy" },
  { value: "understanding", label: "Understanding" },
  { value: "connection", label: "Connection" },
  { value: "general", label: "General" },
];

const TYPE_ICONS: Record<LibraryContentType, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  link: <Link2 className="h-4 w-4" />,
};

const DIM_COLORS: Record<LibraryDimension, string> = {
  clarity: "text-violet-400 bg-violet-400/10",
  engagement: "text-cyan-400 bg-cyan-400/10",
  energy: "text-amber-400 bg-amber-400/10",
  understanding: "text-emerald-400 bg-emerald-400/10",
  connection: "text-pink-400 bg-pink-400/10",
  general: "text-slate-400 bg-slate-400/10",
};

interface ContentItem extends Omit<LibraryContent, "createdAt"> {
  createdAt: string | null;
}

export default function OrgContentPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<LibraryContentType>("video");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDimension, setFormDimension] = useState<LibraryDimension>("general");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [contentRes, infoRes] = await Promise.all([
      fetch(`/api/org/${orgId}/content`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/org/${orgId}/info`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (contentRes.status === 401) { router.replace("/auth/login"); return; }
    if (!contentRes.ok) { setError("Unable to load content library."); setLoading(false); return; }
    const data = await contentRes.json();
    setItems(data.items ?? []);
    if (infoRes.ok) {
      const info = await infoRes.json();
      setOrgName(info.name ?? "");
      setMyRole(info.myRole ?? null);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orgId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, fetchItems]);

  const isAdmin = myRole === "owner" || myRole === "admin";

  function resetForm() {
    setFormTitle(""); setFormDescription(""); setFormUrl("");
    setFormDimension("general"); setFormFile(null); setFormError("");
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    setFormError("");

    try {
      let storageReference: string | null = null;
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (formType === "pdf" && formFile) {
        const path = `org-content/${orgId}/${Date.now()}_${formFile.name}`;
        const sRef = storageRef(storage, path);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(sRef, formFile);
          task.on("state_changed",
            (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => {
              fileUrl = await getDownloadURL(task.snapshot.ref);
              storageReference = path;
              fileName = formFile.name;
              resolve();
            }
          );
        });
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formTitle, description: formDescription,
          type: formType, url: formUrl || null,
          storageRef: storageReference, fileUrl, fileName,
          dimension: formDimension,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error ?? "Failed to add content.");
        return;
      }

      resetForm();
      setShowForm(false);
      fetchItems();
    } catch {
      setFormError("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  async function toggleVisibility(item: ContentItem) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/org/${orgId}/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isVisible: !i.isVisible } : i));
  }

  async function deleteItem(item: ContentItem) {
    if (!user || !confirm(`Delete "${item.title}"?`)) return;
    const token = await user.getIdToken();
    await fetch(`/api/org/${orgId}/content/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <p className="text-slate-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">{orgName}</p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-slate-400" />
              Content Library
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <a href={`/${orgId}/members`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Members</a>
              <a href={`/${orgId}/billing`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Billing</a>
              <span className="text-sm text-violet-400 font-medium">Content</span>
              <a href={`/${orgId}/sessions`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Sessions</a>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setShowForm(true); resetForm(); }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add content
            </button>
          )}
        </div>

        {/* Add content form */}
        {showForm && isAdmin && (
          <div className="mb-8 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">Add content</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-1 mb-5 bg-[#0a0f1a] rounded-xl p-1">
              {(["video", "link", "pdf"] as LibraryContentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    formType === t ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {TYPE_ICONS[t]}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title *"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <textarea
                placeholder="Description (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />

              {(formType === "video" || formType === "link") && (
                <input
                  type="url"
                  placeholder={formType === "video" ? "Vimeo or YouTube URL *" : "Link URL *"}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                  className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              )}

              {formType === "pdf" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,.key,.doc,.docx"
                    onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer"
                  />
                  <p className="text-xs text-slate-600 mt-1">PDF, PPT, PPTX, KEY, DOC, DOCX</p>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}

              <select
                value={formDimension}
                onChange={(e) => setFormDimension(e.target.value as LibraryDimension)}
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                {DIMENSIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {submitting ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : "Saving…") : "Add to library"}
              </button>
            </form>
          </div>
        )}

        {/* Content list */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
            {isAdmin
              ? <>No content yet — click <strong className="text-slate-300">Add content</strong> to upload your first resource.</>
              : "No content in the library yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 bg-[#0f172a] border rounded-xl px-4 py-3 transition-colors ${
                  item.isVisible ? "border-[#1e293b]" : "border-[#1e293b] opacity-50"
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-slate-400 shrink-0">
                  {TYPE_ICONS[item.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIM_COLORS[item.dimension]}`}>
                      {item.dimension}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                  )}
                  {item.type !== "pdf" && item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 truncate block mt-0.5"
                    >
                      {item.url}
                    </a>
                  )}
                  {item.type === "pdf" && item.fileName && (
                    <a
                      href={item.fileUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 truncate block mt-0.5"
                    >
                      {item.fileName}
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleVisibility(item)}
                      title={item.isVisible ? "Hide" : "Show"}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                      {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
