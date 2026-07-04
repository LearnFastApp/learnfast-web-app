"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Mail, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type Stage = "loading" | "confirm" | "accepting" | "success" | "error";

type TokenMeta = {
  orgName: string;
  orgId: string;
  role: string;
  inviterName: string;
  email: string;
  expiresAt: string;
};

type ErrorKind =
  | "invalid_token"
  | "token_expired"
  | "token_already_used"
  | "already_in_org"
  | "no_seats_available"
  | "email_mismatch"
  | "unknown";

const ERROR_COPY: Record<ErrorKind, { title: string; body: string }> = {
  invalid_token: { title: "Invalid invitation", body: "This link is not valid. Ask your admin to resend the invitation." },
  token_expired: { title: "Invitation expired", body: "This invitation link has expired. Ask your admin to send a new one." },
  token_already_used: { title: "Already accepted", body: "This invitation has already been used." },
  already_in_org: { title: "Already a member", body: "You're already a member of an organisation on LearnFast." },
  no_seats_available: { title: "No seats available", body: "This organisation has no available seats. Contact your admin." },
  email_mismatch: { title: "Wrong account", body: "This invitation was sent to a different email address. Please sign in with the correct account." },
  unknown: { title: "Something went wrong", body: "Please try again or contact support." },
};

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { user, loading: authLoading } = useAuth();

  const [stage, setStage] = useState<Stage>("loading");
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>("unknown");
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store token so auth callback can redirect back here
      window.localStorage.setItem("pendingOrgInviteToken", token);
      router.replace(`/auth/login?redirect=/org/join/${token}`);
      return;
    }

    // Fetch token metadata to show confirmation screen
    async function fetchMeta() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch(`/api/org/invite-meta/${token}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorKind((data.error as ErrorKind) ?? "unknown");
          setStage("error");
          return;
        }
        const data = await res.json();
        setMeta(data);
        setStage("confirm");
      } catch {
        setErrorKind("unknown");
        setStage("error");
      }
    }

    fetchMeta();
  }, [user, authLoading, token, router]);

  async function acceptInvite() {
    if (!user || !meta) return;
    setStage("accepting");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${meta.orgId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorKind((data.error as ErrorKind) ?? "unknown");
        if (data.invited) setInvitedEmail(data.invited as string);
        setStage("error");
        return;
      }
      setStage("success");
      setTimeout(() => router.replace(`/${meta.orgId}/members`), 2000);
    } catch {
      setErrorKind("unknown");
      setStage("error");
    }
  }

  if (stage === "loading" || authLoading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (stage === "error") {
    const err = ERROR_COPY[errorKind];
    const isMismatch = errorKind === "email_mismatch";

    async function switchAccount() {
      await signOut(auth);
      window.localStorage.setItem("pendingOrgInviteToken", token);
      window.location.href = `/auth/login?redirect=/org/join/${token}`;
    }

    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{err.title}</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">{err.body}</p>
          {isMismatch && invitedEmail && (
            <p className="text-xs text-slate-500 mb-6">
              This invite is for <span className="text-slate-300">{invitedEmail}</span>
            </p>
          )}
          {!isMismatch && <div className="mb-6" />}
          <div className="flex flex-col gap-3">
            {isMismatch && (
              <button
                onClick={switchAccount}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Sign in with the right account
              </button>
            )}
            <a href="/dashboard" className="text-violet-400 text-sm underline">
              Go to dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "success") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Welcome aboard!</h1>
          <p className="text-slate-400 text-sm">Taking you to your organisation…</p>
        </div>
      </main>
    );
  }

  if (stage === "accepting") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  // stage === "confirm"
  if (!meta) return null;

  const expiresDate = new Date(meta.expiresAt);
  const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-5">
            <p className="text-xs font-semibold text-violet-200 uppercase tracking-widest mb-1">Invitation</p>
            <p className="text-white text-lg font-bold">{meta.orgName}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Invited by</p>
                <p className="text-sm text-white">{meta.inviterName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm text-white capitalize">{meta.role}</p>
              </div>
            </div>
            {daysLeft > 0 && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-300">
                  Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={acceptInvite}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Join {meta.orgName}
            </button>
            <a
              href="/dashboard"
              className="block text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Not now
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
