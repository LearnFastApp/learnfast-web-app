"use client";

import { useState } from "react";
import Image from "next/image";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyNeeded, setVerifyNeeded] = useState(false);

  function friendlyError(code: string): string {
    switch (code) {
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Incorrect email or password.";
      case "auth/too-many-requests": return "Too many attempts. Please try again later.";
      default: return "Something went wrong. Please try again.";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "reset") {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? "";
        setError(friendlyError(code));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signup") {
      if (password !== confirm) { setError("Passwords don't match."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
        await setDoc(
          doc(db, "presenters", result.user.uid),
          {
            email: result.user.email,
            displayName: name.trim() || email.split("@")[0],
            subscriptionStatus: "free",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        await sendEmailVerification(result.user, {
          url: `${window.location.origin}/auth/login`,
        });
        setVerificationSent(true);
        return;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (!result.user.emailVerified) {
          await auth.signOut();
          setVerifyNeeded(true);
          return;
        }
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          <Image src="/icon-mark.png" alt="" width={80} height={58} className="row-span-2 self-center" priority />
          <p className="self-end leading-none text-[1.35rem] font-bold tracking-tight" style={{ color: '#5bb8f5' }}>
            LEARN<span className="font-light">FAST</span><sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </p>
          <p className="self-start text-sm text-slate-400 leading-tight">Feedback Intelligence</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-8">
          {verificationSent ? (
            <div className="text-center">
              <p className="text-4xl mb-4">📬</p>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-slate-400 mb-2">
                We&apos;ve sent a confirmation link to <span className="text-white">{email}</span>.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Click the link to verify your account, then sign in below.
              </p>
              <button
                onClick={() => { setVerificationSent(false); setMode("signin"); }}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                Go to sign in
              </button>
            </div>
          ) : null}

          {verifyNeeded ? (
            <div className="text-center">
              <p className="text-4xl mb-4">✉️</p>
              <h2 className="text-xl font-bold text-white mb-2">Verify your email first</h2>
              <p className="text-sm text-slate-400 mb-6">
                Please click the link we sent to <span className="text-white">{email}</span> before signing in.
              </p>
              <button
                onClick={async () => {
                  try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(result.user, {
                      url: `${window.location.origin}/auth/login`,
                    });
                    await auth.signOut();
                  } catch { /* ignore */ }
                }}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white transition mb-3"
              >
                Resend verification email
              </button>
              <button
                onClick={() => { setVerifyNeeded(false); setMode("signin"); }}
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
              >
                Back to sign in
              </button>
            </div>
          ) : null}
          {!verificationSent && !verifyNeeded && mode !== "reset" && (
            <div className="mb-8 flex rounded-xl border border-white/10 bg-[#0f1424] p-1">
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signin" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Create account
              </button>
            </div>
          )}

          {!verificationSent && !verifyNeeded && mode === "reset" ? (
            resetSent ? (
              <div className="text-center">
                <p className="text-2xl mb-3">📬</p>
                <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-slate-400 text-sm mb-6">
                  We sent a password reset link to <span className="text-white">{email}</span>.
                </p>
                <button
                  onClick={() => { setMode("signin"); setResetSent(false); }}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Reset password</h2>
                <p className="text-sm text-slate-400 mb-6">Enter your email and we&apos;ll send a reset link.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                  />
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setError(""); }}
                    className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
                  >
                    Back to sign in
                  </button>
                </form>
              </>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                />
              )}
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              {mode === "signup" && (
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                />
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
              >
                {loading
                  ? mode === "signup" ? "Creating account…" : "Signing in…"
                  : mode === "signup" ? "Create account" : "Sign in"}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(""); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}
        </div>

        {mode === "signup" && (
          <p className="mt-4 text-center text-xs text-slate-600">
            By creating an account you agree to our terms of service.
          </p>
        )}
      </div>
    </main>
  );
}
