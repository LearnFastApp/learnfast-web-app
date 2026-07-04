"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Settings, Loader2, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";

export default function OrgSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
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
        setMyRole(d.myRole ?? null);
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
        body: JSON.stringify({ name: orgName, logoUrl: logoUrl || null }),
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
      <MobileNav />
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-7 h-7 text-violet-400" />
            <h1 className="text-2xl font-bold">Organisation settings</h1>
          </div>

          {/* Nav */}
          <nav className="flex flex-wrap gap-1">
            {[
              { href: `/${orgId}/members`, label: "Members" },
              { href: `/${orgId}/billing`, label: "Billing" },
              { href: `/${orgId}/content`, label: "Content" },
              { href: `/${orgId}/sessions`, label: "Sessions" },
              { href: `/${orgId}/rehearse`, label: "Rehearse" },
              ...(isAdmin ? [{ href: `/${orgId}/analytics`, label: "Analytics" }] : []),
              { href: `/${orgId}/my-sessions`, label: "My sessions" },
              { href: `/${orgId}/community`, label: "Community" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {label}
              </a>
            ))}
            <span className="px-3 py-1.5 rounded-lg text-sm text-violet-400 bg-violet-400/10 font-medium">
              Settings
            </span>
          </nav>
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
    </div>
  );
}
