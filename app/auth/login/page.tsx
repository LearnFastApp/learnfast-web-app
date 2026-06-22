"use client";

import { useState } from "react";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ACTION_CODE_SETTINGS = {
  url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
  handleCodeInApp: true,
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
      window.localStorage.setItem("emailForSignIn", email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl overflow-hidden bg-white px-2 py-1.5">
            <img src="/logo.png" alt="LearnFast" className="h-7 w-auto" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">LearnFast</p>
            <p className="text-xs text-slate-400">Feedback Intelligence</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-8">
          {sent ? (
            <div className="text-center">
              <div className="mb-4 text-4xl">📬</div>
              <h1 className="mb-2 text-xl font-bold text-white">Check your email</h1>
              <p className="text-slate-400">
                We sent a sign-in link to <span className="text-white">{email}</span>.
                Click it to access your dashboard.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">Sign in</h1>
              <p className="mb-8 text-slate-400">
                Enter your email and we&apos;ll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
