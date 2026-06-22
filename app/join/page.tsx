"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 6) router.push(`/session/${clean}`);
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden bg-white mx-auto">
          <img src="/logo.png" alt="LearnFast" className="h-12 w-12 object-contain" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Join a session</h1>
        <p className="mb-8 text-slate-400">Enter the 6-character code from your presenter.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            maxLength={6}
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-4 text-center text-2xl font-bold tracking-widest text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={code.trim().length !== 6}
            className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
          >
            Join →
          </button>
        </form>
      </div>
    </main>
  );
}
