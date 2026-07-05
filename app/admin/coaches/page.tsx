"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  Users, Plus, Edit2, Trash2, Eye, Star, StarOff,
  Loader2, CheckCircle, XCircle, ChevronDown, AlertCircle, Upload,
} from "lucide-react";
import type { CoachStatus, ListingTier } from "@/types/enterprise";

const PLATFORM_ADMIN = "physicalperformance@icloud.com";

interface Coach {
  id: string;
  slug: string;
  status: CoachStatus;
  name: string;
  email: string;
  headshotUrl: string;
  quote: string;
  bioShort: string;
  bioLong: string;
  specialties: string[];
  credentials: string;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  timezone: string;
  meetingUrl: string;
  callDurationMins: number;
  learnfastScore: number | null;
  archetype: string | null;
  introVideoId: string | null;
  listingTier: ListingTier;
  featured: boolean;
  metrics: { profileViews: number; bookingRequests: number; confirmedCalls: number };
}

interface Application {
  id: string;
  name: string;
  email: string;
  linkedinUrl: string;
  websiteUrl: string;
  credentials: string;
  timezone: string;
  specialties: string;
  quote: string;
  bioShort: string;
  bioLong: string;
  pitch: string;
  tryCompleted: boolean;
  status: "new" | "accepted" | "rejected";
  createdAt: string | null;
}

interface Call {
  id: string;
  coachName: string;
  userName: string;
  userEmail: string;
  status: string;
  source: string;
  confirmedSlot: { start: string; end: string } | null;
  createdAt: string | null;
}

type Tab = "coaches" | "applications" | "calls";

const STATUS_LABELS: Record<CoachStatus, string> = {
  draft: "Draft", pending_review: "Pending review", live: "Live", paused: "Paused",
};
const STATUS_COLORS: Record<CoachStatus, string> = {
  draft: "text-slate-400 bg-slate-400/10",
  pending_review: "text-amber-400 bg-amber-400/10",
  live: "text-green-400 bg-green-400/10",
  paused: "text-red-400 bg-red-400/10",
};
const CALL_STATUS_COLORS: Record<string, string> = {
  requested: "text-amber-400 bg-amber-400/10",
  confirmed: "text-green-400 bg-green-400/10",
  declined: "text-red-400 bg-red-400/10",
  cancelled: "text-slate-400 bg-slate-400/10",
  completed: "text-blue-400 bg-blue-400/10",
  expired: "text-slate-500 bg-slate-500/10",
};

const BLANK_FORM = {
  slug: "", name: "", email: "", headshotUrl: "", quote: "", bioShort: "",
  bioLong: "", specialties: "", credentials: "", linkedinUrl: "", websiteUrl: "",
  timezone: "Europe/London", meetingUrl: "", callDurationMins: 30,
  learnfastScore: "", archetype: "", introVideoId: "", listingTier: "standard" as ListingTier,
};

export default function AdminCoachesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("coaches");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [headshotProgress, setHeadshotProgress] = useState(0);
  const headshotInputRef = useRef<HTMLInputElement>(null);

  async function handleHeadshotUpload(file: File) {
    setHeadshotUploading(true);
    setHeadshotProgress(0);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `coach-headshots/${Date.now()}.${ext}`;
      const sRef = storageRef(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file);
        task.on(
          "state_changed",
          (snap) => setHeadshotProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setForm((f) => ({ ...f, headshotUrl: url }));
            resolve();
          }
        );
      });
    } catch {
      setFormError("Headshot upload failed. Please try again.");
    } finally {
      setHeadshotUploading(false);
      setHeadshotProgress(0);
    }
  }

  const fetchCoaches = useCallback(async (token: string) => {
    const res = await fetch("/api/admin/coaches", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCoaches((await res.json()).coaches ?? []);
  }, []);

  const fetchApplications = useCallback(async (token: string) => {
    const res = await fetch("/api/admin/applications", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setApplications((await res.json()).applications ?? []);
  }, []);

  const fetchCalls = useCallback(async (token: string) => {
    const res = await fetch("/api/admin/calls", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCalls((await res.json()).calls ?? []);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const token = await user.getIdToken();
    await Promise.all([fetchCoaches(token), fetchApplications(token), fetchCalls(token)]);
    setLoading(false);
  }, [user, fetchCoaches, fetchApplications, fetchCalls]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    if (user.email !== PLATFORM_ADMIN) { router.replace("/dashboard"); return; }
    fetchAll();
  }, [user, authLoading, fetchAll, router]);

  function openCreate() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openFromApplication(a: Application) {
    setEditingId(null);
    const name = a.name ?? "";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm({
      ...BLANK_FORM,
      name,
      email: a.email ?? "",
      slug,
      linkedinUrl: a.linkedinUrl ?? "",
      websiteUrl: a.websiteUrl ?? "",
      credentials: a.credentials ?? "",
      timezone: a.timezone ?? "Europe/London",
      specialties: a.specialties ?? "",
      quote: a.quote ?? "",
      bioShort: a.bioShort || (a.pitch ?? "").slice(0, 280),
      bioLong: a.bioLong || a.pitch || "",
    });
    setFormError("");
    setTab("coaches");
    setShowForm(true);
  }

  function openEdit(c: Coach) {
    setEditingId(c.id);
    setForm({
      slug: c.slug, name: c.name, email: c.email, headshotUrl: c.headshotUrl,
      quote: c.quote, bioShort: c.bioShort, bioLong: c.bioLong,
      specialties: c.specialties.join(", "), credentials: c.credentials,
      linkedinUrl: c.linkedinUrl ?? "", websiteUrl: c.websiteUrl ?? "",
      timezone: c.timezone, meetingUrl: c.meetingUrl,
      callDurationMins: c.callDurationMins,
      learnfastScore: c.learnfastScore != null ? String(c.learnfastScore) : "",
      archetype: c.archetype ?? "", introVideoId: c.introVideoId ?? "",
      listingTier: c.listingTier,
    });
    setFormError("");
    setShowForm(true);
  }

  async function saveCoach(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setFormError("");
    const token = await user.getIdToken();
    const body = {
      ...form,
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      callDurationMins: Number(form.callDurationMins),
      learnfastScore: form.learnfastScore !== "" ? Number(form.learnfastScore) : null,
      archetype: form.archetype || null,
      introVideoId: form.introVideoId || null,
      linkedinUrl: form.linkedinUrl || null,
      websiteUrl: form.websiteUrl || null,
    };
    const url = editingId ? `/api/admin/coaches/${editingId}` : "/api/admin/coaches";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed to save."); setSaving(false); return; }
    setShowForm(false);
    setSaving(false);
    fetchAll();
  }

  async function deleteCoach(id: string, name: string) {
    if (!user || !confirm(`Delete coach "${name}"? This cannot be undone.`)) return;
    const token = await user.getIdToken();
    await fetch(`/api/admin/coaches/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchAll();
  }

  async function patchCoach(id: string, patch: Record<string, unknown>) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/admin/coaches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    fetchAll();
  }

  async function updateAppStatus(id: string, status: "accepted" | "rejected") {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    fetchApplications(token);
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  const STATUS_ORDER: CoachStatus[] = ["live", "pending_review", "draft", "paused"];
  const sortedCoaches = [...coaches].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold">Coach Roster</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/content" className="text-sm text-slate-400 hover:text-white transition-colors">← Content</a>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add coach
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#0f172a] border border-[#1e293b] rounded-xl p-1 w-fit">
          {(["coaches", "applications", "calls"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "applications" ? `Applications (${applications.filter((a) => a.status === "new").length})` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ── Coaches tab ── */}
        {tab === "coaches" && (
          <div className="space-y-3">
            {sortedCoaches.length === 0 && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-12 text-center">
                <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No coaches yet. Click "Add coach" to get started.</p>
              </div>
            )}
            {sortedCoaches.map((c) => (
              <div key={c.id} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 flex flex-wrap items-start gap-4">
                {c.headshotUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.headshotUrl} alt={c.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    {c.featured && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Featured</span>}
                    {c.listingTier === "founding" && <span className="text-[10px] text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded">Founding</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.credentials}</p>
                  <p className="text-xs text-slate-600 mt-0.5">/coaches/{c.slug}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>{c.metrics.profileViews} views</span>
                    <span>{c.metrics.bookingRequests} requests</span>
                    <span>{c.metrics.confirmedCalls} confirmed</span>
                    {c.metrics.bookingRequests > 0 && (
                      <span className="text-violet-400">
                        {Math.round((c.metrics.confirmedCalls / c.metrics.bookingRequests) * 100)}% conversion
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Status selector */}
                  <div className="relative">
                    <select
                      value={c.status}
                      onChange={(e) => patchCoach(c.id, { status: e.target.value })}
                      className="appearance-none text-xs bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-1.5 pr-6 text-slate-300 focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending review</option>
                      <option value="live">Live</option>
                      <option value="paused">Paused</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => patchCoach(c.id, { featured: !c.featured })}
                    title={c.featured ? "Unfeature" : "Feature"}
                    className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {c.featured ? <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  <a href={`/coaches/${c.slug}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => openEdit(c)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCoach(c.id, c.name)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Applications tab ── */}
        {tab === "applications" && (
          <div className="space-y-3">
            {applications.length === 0 && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-12 text-center">
                <p className="text-slate-500 text-sm">No applications yet.</p>
              </div>
            )}
            {applications.map((a) => (
              <div key={a.id} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                    {a.linkedinUrl && <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline">{a.linkedinUrl}</a>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      a.status === "new" ? "text-amber-400 bg-amber-400/10" :
                      a.status === "accepted" ? "text-green-400 bg-green-400/10" :
                      "text-red-400 bg-red-400/10"
                    }`}>{a.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${a.tryCompleted ? "text-green-400 bg-green-400/10" : "text-slate-500 bg-slate-500/10"}`}>
                      {a.tryCompleted ? "/try done" : "/try pending"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2"><strong className="text-slate-300">Specialties:</strong> {a.specialties}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-3">{a.pitch}</p>
                {a.status === "new" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => updateAppStatus(a.id, "accepted")}
                      className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 hover:bg-green-400/20 px-3 py-1.5 rounded-lg transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button onClick={() => updateAppStatus(a.id, "rejected")}
                      className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {a.status === "accepted" && (
                  <div className="mt-3">
                    <button
                      onClick={() => openFromApplication(a)}
                      className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-400/10 hover:bg-violet-400/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create coach profile
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Calls tab ── */}
        {tab === "calls" && (
          <div className="space-y-3">
            {calls.length === 0 && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-12 text-center">
                <p className="text-slate-500 text-sm">No discovery calls yet.</p>
              </div>
            )}
            {calls.map((c) => (
              <div key={c.id} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{c.coachName} × {c.userName}</p>
                  <p className="text-xs text-slate-500">{c.userEmail}</p>
                  {c.confirmedSlot && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(c.confirmedSlot.start).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${CALL_STATUS_COLORS[c.status] ?? "text-slate-400 bg-slate-400/10"}`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-slate-600">{c.source}</span>
                  {c.createdAt && <span className="text-xs text-slate-600">{new Date(c.createdAt).toLocaleDateString("en-GB")}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coach create/edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-6 border-b border-[#1e293b]">
              <h2 className="text-base font-semibold">{editingId ? "Edit coach" : "Add coach"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveCoach} className="p-6 space-y-4">
              {[
                { key: "name", label: "Full name", required: true },
                { key: "slug", label: "Slug (URL-safe)", required: true, placeholder: "jane-smith" },
                { key: "email", label: "Email (private — not shown publicly)", required: true, type: "email" },
                { key: "credentials", label: "Credentials line", required: true, placeholder: "ICF PCC, 15 yrs C-suite coaching" },
                { key: "quote", label: "Pull quote (max 140 chars)", required: true },
                { key: "bioShort", label: "Short bio (max 280 chars, shown on card)", required: true },
                { key: "meetingUrl", label: "Meeting URL (Zoom/Meet room)", required: true },
                { key: "timezone", label: "Timezone (IANA)", required: true, placeholder: "Europe/London" },
                { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
                { key: "websiteUrl", label: "Website URL" },
                { key: "specialties", label: "Specialties (comma-separated)", placeholder: "Board presentations, Executive presence" },
                { key: "archetype", label: "Presenter archetype (from /try)" },
                { key: "introVideoId", label: "Bunny.net video ID (optional)" },
              ].map(({ key, label, required, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    required={required}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              ))}

              {/* Headshot upload */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Headshot (800×800 square recommended)</label>
                <input
                  ref={headshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleHeadshotUpload(file);
                  }}
                />
                <div className="flex items-center gap-3">
                  {form.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.headshotUrl} alt="Headshot preview" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#1e293b]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#0a0f1a] border border-[#1e293b] flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => headshotInputRef.current?.click()}
                      disabled={headshotUploading}
                      className="flex items-center gap-2 text-sm bg-[#0a0f1a] border border-[#1e293b] hover:border-violet-500/50 text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {headshotUploading ? `Uploading… ${headshotProgress}%` : form.headshotUrl ? "Replace photo" : "Upload photo"}
                    </button>
                    {headshotUploading && (
                      <div className="mt-2 h-1 bg-[#1e293b] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${headshotProgress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Long bio */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Long bio (markdown supported)</label>
                <textarea
                  rows={5}
                  value={form.bioLong}
                  onChange={(e) => setForm((f) => ({ ...f, bioLong: e.target.value }))}
                  className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-y"
                />
              </div>

              {/* Numeric fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Call duration (mins)</label>
                  <input type="number" min={15} max={90} value={form.callDurationMins}
                    onChange={(e) => setForm((f) => ({ ...f, callDurationMins: Number(e.target.value) }))}
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">LearnFast score (0–100)</label>
                  <input type="number" min={0} max={100} value={form.learnfastScore}
                    onChange={(e) => setForm((f) => ({ ...f, learnfastScore: e.target.value }))}
                    placeholder="e.g. 82"
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              {/* Listing tier */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Listing tier</label>
                <div className="relative">
                  <select value={form.listingTier} onChange={(e) => setForm((f) => ({ ...f, listingTier: e.target.value as ListingTier }))}
                    className="w-full appearance-none bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-violet-500">
                    <option value="standard">Standard</option>
                    <option value="founding">Founding</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create coach"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-[#0a0f1a] border border-[#1e293b] text-slate-400 hover:text-white rounded-xl text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
