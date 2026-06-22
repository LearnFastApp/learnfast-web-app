"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
  const [loading, setLoading] = useState(false);

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
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl overflow-hidden bg-white px-2 py-1.5">
            <img src="/logo.png" alt="LearnFast" className="h-7 w-auto" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">LearnFast</p>
            <p className="text-xs text-slate-500">Feedback Intelligence</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          {mode !== "reset" && (
            <div className="mb-8 flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signin" ? "bg-violet-500 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-violet-500 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                Create account
              </button>
            </div>
          )}

          {mode === "reset" ? (
            resetSent ? (
              <div className="text-center">
                <p className="text-2xl mb-3">📬</p>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
                <p className="text-slate-500 text-sm mb-6">
                  We sent a password reset link to <span className="text-slate-900">{email}</span>.
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">Reset password</h2>
                <p className="text-sm text-slate-500 mb-6">Enter your email and we&apos;ll send a reset link.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500"
                  />
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-slate-900 hover:bg-violet-400 disabled:opacity-50"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500"
                />
              )}
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500"
              />
              {mode === "signup" && (
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500"
                />
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
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
