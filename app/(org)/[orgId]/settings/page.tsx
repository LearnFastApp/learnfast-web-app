"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Settings, Loader2, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";

export default function OrgSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultLocale, setDefaultLocale] = useState<"en" | "fr">("en");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [coachRosterEnabled, setCoachRosterEnabled] = useState(true);
  const [coachRosterMode, setCoachRosterMode] = useState<"all" | "approved_only">("all");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace("/auth/login"); return; }
      if (res.status === 403) { router.replace("/dashboard"); return; }
      if (res.ok) {
        const d = await res.json();
        setOrgName(d.name ?? "");
        setLogoUrl(d.logoUrl ?? "");
        setDefaultLocale((d.defaultLocale as "en" | "fr") ?? "en");
        setMyRole(d.myRole ?? null);
        if (d.coachRoster) {
          setCoachRosterEnabled(d.coachRoster.enabled ?? true);
          setCoachRosterMode(d.coachRoster.mode ?? "all");
        }
      }
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  const isAdmin = myRole === "owner" || myRole === "admin";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isAdmin) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: orgName,
          logoUrl: logoUrl || null,
          defaultLocale,
          coachRoster: { enabled: coachRosterEnabled, mode: coachRosterMode, approvedCoachIds: [] },
        }),
      });
      if (res.ok) {
        setSuccess("Settings saved.");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error === "invalid_logo_url" ? "Logo URL must start with http:// or https://" : "Failed to save. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} />
      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold">Organisation settings</h1>
        </div>

        {!isAdmin ? (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Only admins can edit organisation settings.</p>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-6">
            {/* Org name */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <label className="block text-sm font-semibold text-white mb-1">
                Organisation name
              </label>
              <p className="text-xs text-slate-500 mb-3">Shown to your team members throughout the app.</p>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                minLength={2}
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Logo URL */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <label className="block text-sm font-semibold text-white mb-1">
                Logo URL
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Paste a public image URL (PNG or SVG recommended). This marks your branding as set.
              </p>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://yourcompany.com/logo.png"
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              {logoUrl && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#0a0f1a] border border-[#1e293b] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-400">Preview</p>
                </div>
              )}
            </div>

            {/* Default member language */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <label className="block text-sm font-semibold text-white mb-1">
                Default member language
              </label>
              <p className="text-xs text-slate-500 mb-4">
                New members inherit this language when they join. Existing members keep their own preference.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDefaultLocale("en")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    defaultLocale === "en"
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-[#0a0f1a] border-[#1e293b] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span>🇬🇧</span> English
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultLocale("fr")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    defaultLocale === "fr"
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-[#0a0f1a] border-[#1e293b] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span>🇫🇷</span> Français
                </button>
              </div>
            </div>

            {/* Coach roster */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-white">Coach roster</label>
                <button
                  type="button"
                  onClick={() => setCoachRosterEnabled(!coachRosterEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${coachRosterEnabled ? "bg-violet-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${coachRosterEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Allow your team to browse and book discovery calls with executive coaches via /coaches.
              </p>
              {coachRosterEnabled && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access mode</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCoachRosterMode("all")}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${coachRosterMode === "all" ? "bg-violet-600 border-violet-500 text-white" : "bg-[#0a0f1a] border-[#1e293b] text-slate-400 hover:border-slate-600"}`}
                    >
                      All coaches
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoachRosterMode("approved_only")}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${coachRosterMode === "approved_only" ? "bg-violet-600 border-violet-500 text-white" : "bg-[#0a0f1a] border-[#1e293b] text-slate-400 hover:border-slate-600"}`}
                    >
                      Approved only
                    </button>
                  </div>
                  {coachRosterMode === "approved_only" && (
                    <p className="text-xs text-slate-500 mt-3">
                      Contact us to configure which specific coaches appear for your team.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !orgName.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
      </main>
    </div>
  );
}
