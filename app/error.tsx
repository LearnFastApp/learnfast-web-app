"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl mb-6">⚠️</p>
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-sm text-slate-400 mb-8">
          An unexpected error occurred. Try again or go back to the dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 transition"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
