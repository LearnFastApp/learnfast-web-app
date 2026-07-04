"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

type Preview = {
  orgId: string;
  orgName: string;
  role: string;
  email: string;
  expiresAt: string;
};

type Stage = "loading" | "form" | "joining" | "success" | "error";
type Tab = "signup" | "signin";
type ErrorKind =
  | "invalid_token"
  | "token_expired"
  | "token_already_used"
  | "already_in_org"
  | "no_seats_available"
  | "email_mismatch"
  | "unknown";

const ERROR_COPY: Record<ErrorKind, string> = {
  invalid_token: "This invitation link is not valid. Ask your admin to resend it.",
  token_expired: "This invitation has expired. Ask your admin to send a new one.",
  token_already_used: "This invitation has already been accepted.",
  already_in_org: "You're already a member of an organisation on LearnFast.",
  no_seats_available: "This organisation has no available seats. Contact your admin.",
  email_mismatch: "Something went wrong matching your account. Please contact your admin.",
  unknown: "Something went wrong. Please try again or contact support.",
};

export default function JoinPage() {
  const params = useParams();
  const token = params?.token as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>("unknown");

  const [tab, setTab] = useState<Tab>("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await fetch(`/api/org/invite-preview/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setErrorKind((data.error as ErrorKind) ?? "unknown");
          setStage("error");
          return;
        }
        setPreview(data);

        // If user is already signed in with the correct email, auto-accept
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email?.toLowerCase() === data.email.toLowerCase()) {
          await acceptInvite(currentUser, data);
          return;
        }

        // If signed in as wrong account, sign out silently so form shows
        if (currentUser) {
          await signOut(auth);
        }

        setStage("form");
      } catch {
        setErrorKind("unknown");
        setStage("error");
      }
    }
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function acceptInvite(
    firebaseUser: { getIdToken: () => Promise<string> },
    p: Preview
  ) {
    setStage("joining");
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch(`/api/org/${p.orgId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorKind((data.error as ErrorKind) ?? "unknown");
        setStage("error");
        return;
      }
      setStage("success");
      setTimeout(() => { window.location.href = `/${p.orgId}/sessions`; }, 1500);
    } catch {
      setErrorKind("unknown");
      setStage("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setFormError("");

    if (tab === "signup") {
      if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
      if (password !== confirm) { setFormError("Passwords don't match."); return; }
    }

    setSubmitting(true);
    try {
      if (tab === "signup") {
        const result = await createUserWithEmailAndPassword(auth, preview.email, password);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
        await setDoc(doc(db, "presenters", result.user.uid), {
          email: preview.email,
          displayName: name.trim() || preview.email.split("@")[0],
          subscriptionStatus: "lite",
          locale: "en",
          industry: "enterprise",
          createdAt: serverTimestamp(),
        }, { merge: true });
        await acceptInvite(result.user, preview);
      } else {
        const result = await signInWithEmailAndPassword(auth, preview.email, password);
        await acceptInvite(result.user, preview);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        setTab("signin");
        setFormError("An account already exists for this email — sign in instead.");
      } else if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setFormError("Incorrect password. Try again or contact your admin.");
      } else if (code === "auth/weak-password") {
        setFormError("Password must be at least 6 characters.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (stage === "loading" || stage === "joining") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
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

  // ── Error ──────────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            {errorKind === "invalid_token" ? "Invalid invitation"
              : errorKind === "token_expired" ? "Invitation expired"
              : errorKind === "token_already_used" ? "Already accepted"
              : errorKind === "already_in_org" ? "Already a member"
              : errorKind === "no_seats_available" ? "No seats available"
              : "Something went wrong"}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{ERROR_COPY[errorKind]}</p>
          <a href="/dashboard" className="text-violet-400 text-sm underline">Go to dashboard</a>
        </div>
      </main>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  if (!preview) return null;

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <Image src="/icon-mark.png" alt="LearnFast" width={32} height={23} />
          <span className="text-base font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span>
            <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
          {/* Org header */}
          <div className="bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-5">
            <p className="text-xs font-semibold text-violet-200 uppercase tracking-widest mb-1">
              You've been invited to join
            </p>
            <p className="text-white text-xl font-bold">{preview.orgName}</p>
            <p className="text-violet-200 text-sm mt-0.5 capitalize">as a {preview.role}</p>
          </div>

          <div className="p-6">
            {/* Tab toggle */}
            <div className="mb-6 flex rounded-xl border border-white/10 bg-[#0a0f1a] p-1">
              <button
                onClick={() => { setTab("signup"); setFormError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "signup" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Create account
              </button>
              <button
                onClick={() => { setTab("signin"); setFormError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "signin" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name — signup only */}
              {tab === "signup" && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 text-sm"
                />
              )}

              {/* Email — locked to invite */}
              <div className="relative">
                <input
                  type="email"
                  value={preview.email}
                  readOnly
                  className="w-full rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-slate-400 outline-none text-sm cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  invited
                </span>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 pr-11 text-white placeholder-slate-500 outline-none focus:border-violet-500 text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm — signup only */}
              {tab === "signup" && (
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 text-sm"
                />
              )}

              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition text-sm"
              >
                {submitting
                  ? "Joining…"
                  : tab === "signup"
                  ? `Create account & join ${preview.orgName}`
                  : `Sign in & join ${preview.orgName}`}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          By joining you agree to our{" "}
          <a href="/terms" className="underline hover:text-slate-400">terms of service</a>.
        </p>
      </div>
    </main>
  );
}
