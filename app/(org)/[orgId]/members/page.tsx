"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Users,
  UserPlus,
  Trash2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";
import OrgPastDueBanner from "@/components/org-past-due-banner";
import type { OrgRole } from "@/types/enterprise";

interface Member {
  id: string;
  displayName: string;
  email: string;
  role: OrgRole;
  status: string;
  joinedAt: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string | null;
  expiresAt: string | null;
}

interface OrgInfo {
  name: string;
  seats: { purchased: number; used: number };
  subscriptionStatus: string;
  trialEndsAt: string | null;
  logoUrl?: string | null;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  coach: "Coach",
  member: "Member",
};

const ROLE_COLORS: Record<OrgRole, string> = {
  owner: "text-violet-400 bg-violet-400/10",
  admin: "text-blue-400 bg-blue-400/10",
  coach: "text-emerald-400 bg-emerald-400/10",
  member: "text-slate-400 bg-slate-400/10",
};

export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const redirectingRef = useRef(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };

      const [membersRes, invitesRes, orgRes] = await Promise.all([
        fetch(`/api/org/${orgId}/members-list`, { headers }),
        fetch(`/api/org/${orgId}/invite`, { headers }),
        fetch(`/api/org/${orgId}/info`, { headers }),
      ]);

      if (membersRes.status === 401) { router.replace("/auth/login"); return; }
      if (membersRes.status === 403) {
        // members-list returns wrong_org if URL orgId doesn't match presenter's orgId
        const errData = await membersRes.json().catch(() => ({}));
        if (errData.error === "wrong_org" && errData.yourOrgId && !redirectingRef.current) {
          redirectingRef.current = true;
          router.replace(`/${errData.yourOrgId}/members`);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      if (membersRes.ok) {
        const d = await membersRes.json();
        setMembers(d.members ?? []);
        setMyRole(d.myRole ?? null);
      }
      if (invitesRes.ok) {
        const d = await invitesRes.json();
        setInvites(d.invites ?? []);
      }
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrgInfo(d);
      }
    } catch {
      setError("Failed to load organisation data.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orgId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, fetchData]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "invite_already_pending") setInviteError("An invite is already pending for this email.");
        else if (data.error === "no_seats_available") setInviteError("No seats available. Upgrade your plan to add more.");
        else setInviteError("Failed to send invite. Please try again.");
        return;
      }
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("member");
      fetchData();
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string, displayName: string) {
    if (!user) return;
    if (!confirm(`Remove ${displayName} from the organisation?`)) return;
    setActionError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        setActionError("Failed to remove member. Please try again.");
        return;
      }
      fetchData();
    } catch {
      setActionError("Network error. Please try again.");
    }
  }

  async function revokeInvite(inviteId: string, email: string) {
    if (!user) return;
    if (!confirm(`Revoke invite for ${email}?`)) return;
    setRevokingId(inviteId);
    setActionError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/invite/${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        setActionError("Failed to revoke invite. Please try again.");
        return;
      }
      fetchData();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setRevokingId(null);
    }
  }

  async function changeRole(userId: string, newRole: OrgRole) {
    if (!user) return;
    setActionError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        setActionError("Failed to update role. Please try again.");
        return;
      }
      fetchData();
    } catch {
      setActionError("Network error. Please try again.");
    }
  }

  const isAdmin = myRole === "owner" || myRole === "admin";

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
        <div className="max-w-sm w-full bg-[#0f172a] border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Unable to load</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  const seatUsed = orgInfo?.seats.used ?? 0;
  const seatPurchased = orgInfo?.seats.purchased ?? 0;
  const seatPct = seatPurchased > 0 ? (seatUsed / seatPurchased) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgInfo?.name} myRole={myRole} logoUrl={orgInfo?.logoUrl ?? null} />
      <main className="md:ml-60 pt-16 md:pt-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-400" />
            Members
          </h1>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white">{seatUsed}<span className="text-slate-500 text-base font-normal">/{seatPurchased}</span></p>
            <p className="text-xs text-slate-400">seats used</p>
            <div className="mt-1 w-24 h-1.5 bg-[#1e293b] rounded-full overflow-hidden ml-auto">
              <div
                className={`h-full rounded-full transition-all ${seatPct >= 90 ? "bg-red-500" : "bg-violet-500"}`}
                style={{ width: `${Math.min(seatPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400 flex-1">{actionError}</p>
            <button onClick={() => setActionError("")} className="text-slate-500 hover:text-white transition text-xs">✕</button>
          </div>
        )}

        {/* Past-due banner */}
        {orgInfo && (
          <OrgPastDueBanner
            subscriptionStatus={orgInfo.subscriptionStatus}
            orgId={orgId}
            isOwner={myRole === "owner"}
          />
        )}

        {/* Trial banner */}
        {orgInfo?.subscriptionStatus === "trialing" && orgInfo.trialEndsAt && (
          <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              Trial ends {new Date(orgInfo.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
              {" "}Billing starts automatically after trial.
            </p>
          </div>
        )}

        {/* Invite form (admin+ only) */}
        {isAdmin && (
          <div className="mb-8 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-400" />
              Invite team member
            </h2>
            <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="flex-1 bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="appearance-none bg-[#0a0f1a] border border-[#1e293b] rounded-xl px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="member">Member</option>
                  <option value="coach">Coach</option>
                  {myRole === "owner" && <option value="admin">Admin</option>}
                </select>
                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteSuccess && (
              <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {inviteSuccess}
              </div>
            )}
            {inviteError && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                {inviteError}
              </div>
            )}
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2 mb-8">
          {members.length === 0 && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl px-6 py-10 text-center">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No members yet</p>
              <p className="text-slate-600 text-xs mt-1">Use the invite form above to add your team.</p>
            </div>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{m.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {isAdmin && m.role !== "owner" && m.id !== user?.uid ? (
                  <div className="relative">
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as OrgRole)}
                      className="appearance-none text-xs px-3 py-1 pr-6 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-slate-300 focus:outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="coach">Coach</option>
                      {myRole === "owner" && <option value="admin">Admin</option>}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
                {isAdmin && m.role !== "owner" && m.id !== user?.uid && (
                  <button
                    onClick={() => removeMember(m.id, m.displayName)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pending invites */}
        {isAdmin && invites.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Pending invites</h2>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between bg-[#0f172a] border border-[#1e293b] border-dashed rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300 truncate">{inv.email}</p>
                      {inv.expiresAt && (
                        <p className="text-xs text-slate-500">
                          Expires {new Date(inv.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className="text-xs text-slate-400 capitalize">{inv.role}</span>
                    <button
                      onClick={() => revokeInvite(inv.id, inv.email)}
                      disabled={revokingId === inv.id}
                      title="Revoke invite"
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 disabled:opacity-40"
                    >
                      {revokingId === inv.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
