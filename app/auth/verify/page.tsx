"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type Step = "idle" | "loading" | "success" | "error";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("t");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  async function verify() {
    if (!token) return;
    setStep("loading");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setStep("success");
        setTimeout(() => router.replace("/auth/login"), 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "token_expired") {
          setError("This link has expired. Please sign in and request a new verification email.");
        } else {
          setError("Invalid or already-used link. Please request a new verification email.");
        }
        setStep("error");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("error");
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h2 className="text-xl font-bold text-white mb-2">Invalid link</h2>
        <p className="text-slate-400 text-sm mb-6">
          This link is incomplete. Please use the link from your verification email.
        </p>
        <a href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300 transition">
          Back to sign in
        </a>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-white mb-2">Email verified!</h2>
        <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-white mb-2">Verification failed</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <a href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300 transition">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-4xl mb-4">📬</p>
      <h2 className="text-xl font-bold text-white mb-2">Verify your email</h2>
      <p className="text-slate-400 text-sm mb-6">
        Click the button below to confirm your email address and activate your account.
      </p>
      <button
        onClick={verify}
        disabled={step === "loading"}
        className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
      >
        {step === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying…
          </>
        ) : (
          "Verify my email"
        )}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          <Image
            src="/icon-mark.png"
            alt=""
            width={80}
            height={58}
            className="row-span-2 self-center"
            priority
          />
          <p
            className="self-end leading-none text-[1.35rem] font-bold tracking-tight"
            style={{ color: "#5bb8f5" }}
          >
            LEARN<span className="font-light">FAST</span>
            <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </p>
          <p className="self-start text-sm text-slate-400 leading-tight">
            Feedback Intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            }
          >
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
