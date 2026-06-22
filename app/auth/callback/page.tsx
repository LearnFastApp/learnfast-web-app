"use client";

import { useEffect, useState } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      router.replace("/auth/login");
      return;
    }

    const email =
      window.localStorage.getItem("emailForSignIn") ??
      window.prompt("Please enter your email to confirm sign-in") ??
      "";

    signInWithEmailLink(auth, email, window.location.href)
      .then(async (result) => {
        window.localStorage.removeItem("emailForSignIn");
        // Upsert presenter doc so it exists for dashboard queries
        await setDoc(
          doc(db, "presenters", result.user.uid),
          {
            email: result.user.email,
            displayName: result.user.displayName ?? email.split("@")[0],
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        router.replace("/");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
      });
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-red-500/30 bg-[#111827] p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/auth/login" className="text-violet-400 underline">
            Try again
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
      <p className="text-slate-400 animate-pulse">Signing you in…</p>
    </main>
  );
}
