"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { INDUSTRIES } from "@/lib/industries";

type Mode = "signin" | "signup" | "reset";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [industry, setIndustry] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyNeeded, setVerifyNeeded] = useState(false);
  const [isFr, setIsFr] = useState(false);

  useEffect(() => {
    setIsFr(navigator.language?.toLowerCase().startsWith("fr"));
  }, []);

  function friendlyError(code: string): string {
    if (isFr) {
      switch (code) {
        case "auth/email-already-in-use": return "Un compte avec cet email existe déjà.";
        case "auth/invalid-email": return "Veuillez entrer une adresse email valide.";
        case "auth/weak-password": return "Le mot de passe doit contenir au moins 6 caractères.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential": return "Email ou mot de passe incorrect.";
        case "auth/too-many-requests": return "Trop de tentatives. Veuillez réessayer plus tard.";
        default: return "Une erreur s'est produite. Veuillez réessayer.";
      }
    }
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
      if (!industry) {
        setError(isFr ? "Veuillez sélectionner votre secteur d'activité." : "Please select your industry sector.");
        return;
      }
      if (password !== confirm) {
        setError(isFr ? "Les mots de passe ne correspondent pas." : "Passwords don't match.");
        return;
      }
      if (password.length < 6) {
        setError(isFr ? "Le mot de passe doit contenir au moins 6 caractères." : "Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
        const detectedLocale = navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
        await setDoc(
          doc(db, "presenters", result.user.uid),
          {
            email: result.user.email,
            displayName: name.trim() || email.split("@")[0],
            subscriptionStatus: "free",
            locale: detectedLocale,
            industry,
            nickname: nickname.trim() || null,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        const claimToken = searchParams.get("claim");
        const verifyRedirect = claimToken
          ? `${window.location.origin}/auth/login?claim=${claimToken}`
          : `${window.location.origin}/auth/login`;
        await sendEmailVerification(result.user, {
          url: verifyRedirect,
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
        // Claim a guest assessment if ?claim=<token> is in the URL
        const claimToken = searchParams.get("claim");
        if (claimToken) {
          try {
            const idToken = await result.user.getIdToken();
            await fetch("/api/guest-claim", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ guestToken: claimToken }),
            });
          } catch {
            // Non-fatal — assessment stays as guest
          }
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
              <h2 className="text-xl font-bold text-white mb-2">
                {isFr ? "Vérifiez vos emails" : "Check your email"}
              </h2>
              <p className="text-sm text-slate-400 mb-2">
                {isFr ? "Nous avons envoyé un lien de confirmation à " : "We've sent a confirmation link to "}
                <span className="text-white">{email}</span>.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                {isFr
                  ? "Cliquez sur le lien pour vérifier votre compte, puis connectez-vous ci-dessous."
                  : "Click the link to verify your account, then sign in below."}
              </p>
              <button
                onClick={() => { setVerificationSent(false); setMode("signin"); }}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-400 transition"
              >
                {isFr ? "Aller à la connexion" : "Go to sign in"}
              </button>
            </div>
          ) : null}

          {verifyNeeded ? (
            <div className="text-center">
              <p className="text-4xl mb-4">✉️</p>
              <h2 className="text-xl font-bold text-white mb-2">
                {isFr ? "Vérifiez d'abord votre email" : "Verify your email first"}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {isFr ? "Cliquez sur le lien envoyé à " : "Please click the link we sent to "}
                <span className="text-white">{email}</span>
                {isFr ? " avant de vous connecter." : " before signing in."}
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
                {isFr ? "Renvoyer l'email de vérification" : "Resend verification email"}
              </button>
              <button
                onClick={() => { setVerifyNeeded(false); setMode("signin"); }}
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
              >
                {isFr ? "Retour à la connexion" : "Back to sign in"}
              </button>
            </div>
          ) : null}

          {!verificationSent && !verifyNeeded && mode !== "reset" && (
            <div className="mb-8 flex rounded-xl border border-white/10 bg-[#0f1424] p-1">
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signin" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {isFr ? "Connexion" : "Sign in"}
              </button>
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {isFr ? "Créer un compte" : "Create account"}
              </button>
            </div>
          )}

          {!verificationSent && !verifyNeeded && mode === "reset" ? (
            resetSent ? (
              <div className="text-center">
                <p className="text-2xl mb-3">📬</p>
                <h2 className="text-xl font-bold text-white mb-2">
                  {isFr ? "Vérifiez vos emails" : "Check your email"}
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  {isFr ? "Nous avons envoyé un lien de réinitialisation à " : "We sent a password reset link to "}
                  <span className="text-white">{email}</span>.
                </p>
                <button
                  onClick={() => { setMode("signin"); setResetSent(false); }}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  {isFr ? "Retour à la connexion" : "Back to sign in"}
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">
                  {isFr ? "Réinitialiser le mot de passe" : "Reset password"}
                </h2>
                <p className="text-sm text-slate-400 mb-6">
                  {isFr ? "Entrez votre email et nous vous enverrons un lien de réinitialisation." : "Enter your email and we'll send a reset link."}
                </p>
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
                    {loading ? (isFr ? "Envoi…" : "Sending…") : (isFr ? "Envoyer le lien" : "Send reset link")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setError(""); }}
                    className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
                  >
                    {isFr ? "Retour à la connexion" : "Back to sign in"}
                  </button>
                </form>
              </>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <input
                    type="text"
                    placeholder={isFr ? "Votre nom (facultatif)" : "Your name (optional)"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                  />
                  <div>
                    <select
                      required
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white outline-none focus:border-violet-500 appearance-none"
                      style={{ color: industry ? "white" : "#64748b" }}
                    >
                      <option value="" disabled style={{ color: "#64748b" }}>
                        {isFr ? "Votre secteur d'activité" : "Your industry sector"}
                      </option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind.value} value={ind.value} style={{ color: "white", background: "#1a2135" }}>
                          {isFr ? ind.fr : ind.en}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-slate-600">
                      {isFr
                        ? "Utilisé pour créer des données de référence par secteur — vous aide à vous comparer à vos pairs."
                        : "Used to build industry benchmarks — helps you compare against your peers."}
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder={isFr ? "Pseudo pour le classement (facultatif)" : "Leaderboard nickname (optional)"}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={24}
                      className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                    />
                    <p className="mt-1.5 text-[11px] text-amber-600">
                      {isFr
                        ? "⚠ Votre pseudo sera visible par les autres utilisateurs sur le classement sectoriel."
                        : "⚠ Your nickname will be visible to other users on the industry leaderboard."}
                    </p>
                  </div>
                </>
              )}
              <input
                type="email"
                required
                placeholder={isFr ? "Adresse email" : "Email address"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <input
                type="password"
                required
                placeholder={isFr ? "Mot de passe" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              {mode === "signup" && (
                <input
                  type="password"
                  required
                  placeholder={isFr ? "Confirmer le mot de passe" : "Confirm password"}
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
                  ? mode === "signup" ? (isFr ? "Création du compte…" : "Creating account…") : (isFr ? "Connexion…" : "Signing in…")
                  : mode === "signup" ? (isFr ? "Créer un compte" : "Create account") : (isFr ? "Se connecter" : "Sign in")}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(""); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  {isFr ? "Mot de passe oublié ?" : "Forgot password?"}
                </button>
              )}
            </form>
          )}
        </div>

        {mode === "signup" && (
          <p className="mt-4 text-center text-xs text-slate-600">
            {isFr
              ? "En créant un compte, vous acceptez nos conditions d'utilisation."
              : "By creating an account you agree to our terms of service."}
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
