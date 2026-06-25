"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Check, Copy, Mail, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface PilotCode {
  code: string;
  orgName: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdAt: string | null;
}

export default function AdminPilotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<PilotCode[]>([]);
  const [fetching, setFetching] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Broadcast email
  const [broadcastPreview, setBroadcastPreview] = useState<{ count: number; emails: { email: string; source: string }[] } | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  async function fetchCodes() {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/pilot/create", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) { router.replace("/dashboard"); return; }
    const data = await res.json();
    setCodes(data.codes ?? []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchCodes();
  }, [user]);

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!user || !orgName.trim()) return;
    setCreating(true);
    setError("");
    setNewCode(null);
    const token = await user.getIdToken();
    const res = await fetch("/api/pilot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orgName: orgName.trim(),
        code: customCode.trim() || undefined,
        maxUses: parseInt(maxUses, 10) || 100,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create code"); setCreating(false); return; }
    setNewCode(data.code);
    setOrgName("");
    setCustomCode("");
    setMaxUses("100");
    setCreating(false);
    fetchCodes();
  }

  async function toggleActive(code: string, current: boolean) {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/pilot/create", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, active: !current }),
    });
    fetchCodes();
  }

  async function loadBroadcastPreview() {
    if (!user) return;
    setBroadcastLoading(true);
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/broadcast", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBroadcastPreview(data);
    setBroadcastLoading(false);
  }

  async function sendBroadcast() {
    if (!user) return;
    setBroadcastSending(true);
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBroadcastResult(data);
    setBroadcastSending(false);
    setBroadcastPreview(null);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Pilot Code Manager</h1>
          <p className="text-slate-400 text-sm">Generate and manage 1-month free pilot access for organisations.</p>
        </div>

        {/* Create form */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1424] p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">Create New Pilot Code</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Organisation name *</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Toastmasters UK"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0a0d1a] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Custom code <span className="text-slate-600">(optional)</span></label>
                <input
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TOASTMASTERS2026"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0d1a] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max uses</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0d1a] px-4 py-3 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {newCode && (
              <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-sm text-green-300">Code created: </span>
                <span className="font-mono font-bold text-white">{newCode}</span>
                <button
                  type="button"
                  onClick={() => copyCode(newCode)}
                  className="ml-auto text-slate-400 hover:text-white transition"
                >
                  {copied === newCode ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Creating…" : "Generate pilot code"}
            </button>
          </form>
        </div>

        {/* Re-engagement broadcast */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1424] p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Re-engagement Email</h2>
          <p className="text-xs text-slate-500 mb-5">Send a one-time email to all previous iOS + web users inviting them to the new platform. Each user is only ever sent this once.</p>

          {broadcastResult ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-green-300">Broadcast complete</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-[#0a0d1a] p-3">
                  <p className="text-xl font-bold text-green-400">{broadcastResult.sent}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Sent</p>
                </div>
                <div className="rounded-lg bg-[#0a0d1a] p-3">
                  <p className="text-xl font-bold text-red-400">{broadcastResult.failed}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Failed</p>
                </div>
                <div className="rounded-lg bg-[#0a0d1a] p-3">
                  <p className="text-xl font-bold text-slate-400">{broadcastResult.skipped}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Skipped</p>
                </div>
              </div>
            </div>
          ) : broadcastPreview ? (
            <div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
                <p className="text-sm text-amber-300 font-semibold mb-1">{broadcastPreview.count} recipients</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mt-3">
                  {broadcastPreview.emails.map((e) => (
                    <div key={e.email} className="flex items-center gap-2 text-xs">
                      <span className={`rounded px-1.5 py-0.5 font-mono ${e.source === "ios" ? "bg-blue-500/20 text-blue-400" : "bg-violet-500/20 text-violet-400"}`}>{e.source}</span>
                      <span className="text-slate-400">{e.email}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={sendBroadcast}
                  disabled={broadcastSending}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                >
                  <Mail className="h-4 w-4" />
                  {broadcastSending ? "Sending…" : `Confirm — send to ${broadcastPreview.count} users`}
                </button>
                <button
                  onClick={() => setBroadcastPreview(null)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={loadBroadcastPreview}
                disabled={broadcastLoading}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 transition"
              >
                <Mail className="h-4 w-4" />
                {broadcastLoading ? "Loading…" : "Preview recipients"}
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  const token = await user.getIdToken();
                  await fetch("/api/admin/broadcast?test=true", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                  alert("Test email sent to " + user.email);
                }}
                className="flex items-center gap-2 rounded-xl border border-violet-500/30 px-5 py-3 text-sm font-semibold text-violet-400 hover:bg-violet-500/10 transition"
              >
                <Mail className="h-4 w-4" />
                Send test to me
              </button>
            </div>
          )}
        </div>

        {/* Existing codes */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1424] p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">Active Codes</h2>
          {codes.length === 0 ? (
            <p className="text-sm text-slate-500">No pilot codes yet.</p>
          ) : (
            <div className="space-y-3">
              {codes.map((c) => (
                <div
                  key={c.code}
                  className={`flex items-center gap-4 rounded-xl border p-4 ${c.active ? "border-white/10 bg-[#0a0d1a]" : "border-white/5 bg-[#080a12] opacity-50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-sm text-white">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-slate-500 hover:text-white transition">
                        {copied === c.code ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{c.orgName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-300 font-semibold">{c.usedCount}/{c.maxUses}</p>
                    <p className="text-[10px] text-slate-600">used</p>
                  </div>
                  <button
                    onClick={() => toggleActive(c.code, c.active)}
                    className="text-slate-400 hover:text-white transition shrink-0"
                    title={c.active ? "Deactivate" : "Activate"}
                  >
                    {c.active
                      ? <ToggleRight className="h-5 w-5 text-green-400" />
                      : <ToggleLeft className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
