"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type Step = "idle" | "loading" | "success" | "error";

function VerifyEmail({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  async function apply() {
    setStep("loading");
    try {
      await applyActionCode(auth, oobCode);
      setStep("success");
      setTimeout(() => router.replace("/auth/login"), 3000);
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code ?? "";
      if (msg === "auth/invalid-action-code" || msg === "auth/expired-action-code") {
        setError("This link has expired or already been used. Please request a new verification email.");
      } else {
        setError("Verification failed. Please try again.");
      }
      setStep("error");
    }
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
        <a
          href="/auth/login"
          className="text-sm text-violet-400 hover:text-violet-300 transition"
        >
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
        onClick={apply}
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

function ResetPassword({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");

  async function apply() {
    setValidationError("");
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setValidationError("Passwords don't match.");
      return;
    }
    setStep("loading");
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setStep("success");
      setTimeout(() => router.replace("/auth/login"), 3000);
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code ?? "";
      if (msg === "auth/invalid-action-code" || msg === "auth/expired-action-code") {
        setError("This reset link has expired. Please request a new one.");
      } else if (msg === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please request a new reset link.");
      }
      setStep("error");
    }
  }

  if (step === "success") {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-white mb-2">Password updated!</h2>
        <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-white mb-2">Reset failed</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <a
          href="/auth/login"
          className="text-sm text-violet-400 hover:text-violet-300 transition"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2 text-center">Set new password</h2>
      <p className="text-slate-400 text-sm mb-6 text-center">Enter your new password below.</p>
      <div className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
        />
        {validationError && (
          <p className="text-sm text-red-400">{validationError}</p>
        )}
        <button
          onClick={apply}
          disabled={step === "loading"}
          className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {step === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </div>
    </div>
  );
}

function ActionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  if (!oobCode || !mode) {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h2 className="text-xl font-bold text-white mb-2">Invalid link</h2>
        <p className="text-slate-400 text-sm mb-6">
          This link is incomplete or has already been used. Please request a new one.
        </p>
        <a
          href="/auth/login"
          className="text-sm text-violet-400 hover:text-violet-300 transition"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  if (mode === "verifyEmail") return <VerifyEmail oobCode={oobCode} />;
  if (mode === "resetPassword") return <ResetPassword oobCode={oobCode} />;

  return (
    <div className="text-center">
      <p className="text-slate-400 text-sm">Unknown action type.</p>
      <a href="/auth/login" className="text-violet-400 mt-4 block text-sm">
        Back to sign in
      </a>
    </div>
  );
}

export default function AuthActionPage() {
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
            <ActionContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
