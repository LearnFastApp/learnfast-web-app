"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, Lock, CreditCard, Check, Zap, LogOut, Tag, Globe, Trophy } from "lucide-react";
import MobileNav from "@/components/mobile-nav";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { INDUSTRIES } from "@/lib/industries";

interface PresenterData {
  displayName?: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  pilotOrgName?: string;
  pilotExpiresAt?: { toDate: () => Date };
  locale?: string;
  nickname?: string;
  industry?: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [presenter, setPresenter] = useState<PresenterData>({});
  const [sessionCount, setSessionCount] = useState(0);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Billing
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  // Pilot code
  const [pilotCode, setPilotCode] = useState("");
  const [pilotLoading, setPilotLoading] = useState(false);
  const [pilotError, setPilotError] = useState("");
  const [pilotSuccess, setPilotSuccess] = useState("");

  // Language
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [localeSaving, setLocaleSaving] = useState(false);
  const [localeSaved, setLocaleSaved] = useState(false);

  // Industry
  const [industry, setIndustry] = useState("");

  // Nickname
  const [nickname, setNickname] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [nicknameError, setNicknameError] = useState("");

  const isFr = locale === "fr";

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? user.email?.split("@")[0] ?? "");

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as PresenterData;
        setPresenter(data);
        if (data.locale === "fr") setLocale("fr");
        if (data.nickname) setNickname(data.nickname);
        if (data.industry) setIndustry(data.industry);
      }
    });

    import("firebase/firestore").then(({ collection, query, where, getDocs }) => {
      getDocs(query(collection(db, "sessions"), where("presenterId", "==", user.uid))).then(
        (snap) => setSessionCount(snap.size)
      );
    });
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileError("");
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, "presenters", user.uid), {
        displayName: displayName.trim(),
        ...(industry ? { industry } : {}),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      setProfileError(isFr ? "Échec de l'enregistrement. Veuillez réessayer." : "Failed to save. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError(isFr ? "Les nouveaux mots de passe ne correspondent pas." : "New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(isFr ? "Le mot de passe doit contenir au moins 6 caractères." : "Password must be at least 6 characters.");
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPasswordError(isFr ? "Le mot de passe actuel est incorrect." : "Current password is incorrect.");
      } else {
        setPasswordError(isFr ? "Échec de la mise à jour du mot de passe." : "Failed to update password. Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleManageBilling() {
    if (!presenter.stripeCustomerId) {
      setPortalError(isFr ? "Aucun compte de facturation trouvé. Contactez le support." : "No billing account found. Please contact support.");
      return;
    }
    setPortalLoading(true);
    setPortalError("");
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerId: presenter.stripeCustomerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error ?? (isFr ? "Impossible d'ouvrir le portail de facturation." : "Failed to open billing portal. Please try again."));
        setPortalLoading(false);
      }
    } catch {
      setPortalError(isFr ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.");
      setPortalLoading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">{isFr ? "Chargement…" : "Loading…"}</p>
      </main>
    );
  }

  const isActive = presenter.subscriptionStatus === "active";
  const isPilot = presenter.subscriptionStatus === "pilot" &&
    !!presenter.pilotExpiresAt?.toDate && presenter.pilotExpiresAt.toDate() > new Date();

  async function handlePilotRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !pilotCode.trim()) return;
    setPilotLoading(true);
    setPilotError("");
    setPilotSuccess("");
    const token = await user.getIdToken();
    const res = await fetch("/api/pilot/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: pilotCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPilotError(data.error ?? (isFr ? "Code invalide. Veuillez réessayer." : "Invalid code. Please try again."));
      setPilotLoading(false);
      return;
    }
    const dateStr = new Date(data.expiresAt).toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
    setPilotSuccess(isFr
      ? `Accès pilote activé pour ${data.orgName} — valable jusqu'au ${dateStr}.`
      : `Pilot access activated for ${data.orgName} — valid until ${dateStr}.`
    );
    setPilotLoading(false);
    setPilotCode("");
    setTimeout(() => window.location.reload(), 2000);
  }

  async function handleSaveNickname(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNicknameError("");
    const trimmed = nickname.trim();
    if (trimmed && trimmed.length < 2) {
      setNicknameError(isFr ? "Le pseudo doit contenir au moins 2 caractères." : "Nickname must be at least 2 characters.");
      return;
    }
    setNicknameSaving(true);
    try {
      await updateDoc(doc(db, "presenters", user.uid), { nickname: trimmed || null });
      setNicknameSaved(true);
      setTimeout(() => setNicknameSaved(false), 3000);
    } catch {
      setNicknameError(isFr ? "Échec de l'enregistrement. Veuillez réessayer." : "Failed to save. Please try again.");
    } finally {
      setNicknameSaving(false);
    }
  }

  async function handleSaveLocale(newLocale: "en" | "fr") {
    if (!user) return;
    setLocale(newLocale);
    setLocaleSaving(true);
    await updateDoc(doc(db, "presenters", user.uid), { locale: newLocale });
    setLocaleSaving(false);
    setLocaleSaved(true);
    setTimeout(() => setLocaleSaved(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-20 lg:pb-0">
      <MobileNav locale={locale} />
      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isFr ? "Paramètres" : "Settings"}</h1>
            <p className="text-sm text-slate-400">{isFr ? "Gérez votre compte et votre abonnement." : "Manage your account and subscription."}</p>
          </div>
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">
            {isFr ? "← Tableau de bord" : "← Dashboard"}
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">

        {/* Profile */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2">
              <User className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="font-bold text-lg">{isFr ? "Profil" : "Profile"}</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{isFr ? "Nom d'affichage" : "Display name"}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                placeholder={isFr ? "Votre nom" : "Your name"}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{isFr ? "Adresse email" : "Email address"}</label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-slate-500 outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {isFr ? "Secteur / Profession" : "Industry / Profession"}
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white outline-none focus:border-violet-500 appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-slate-500">
                  {isFr ? "Sélectionnez votre secteur" : "Select your industry"}
                </option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.value} value={ind.value} className="bg-[#1a2135]">
                    {isFr ? ind.fr : ind.en}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-600">
                {isFr
                  ? "Utilisé pour les classements sectoriels et les conseils IA personnalisés."
                  : "Used for industry leaderboards and personalised AI coaching."}
              </p>
            </div>
            {profileError && <p className="text-sm text-red-400">{profileError}</p>}
            <button
              type="submit"
              disabled={profileSaving}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              {profileSaved ? (
                <><Check className="h-4 w-4" /> {isFr ? "Enregistré" : "Saved"}</>
              ) : profileSaving ? (isFr ? "Enregistrement…" : "Saving…") : (isFr ? "Enregistrer" : "Save changes")}
            </button>
          </form>
        </section>

        {/* Leaderboard Nickname */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{isFr ? "Classement" : "Leaderboard"}</h2>
            </div>
          </div>

          <form onSubmit={handleSaveNickname} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {isFr ? "Pseudo de classement" : "Leaderboard nickname"}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                placeholder={isFr ? "Choisissez un pseudo" : "Choose a nickname"}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-amber-500"
              />
              <p className="mt-2 text-[11px] text-amber-600">
                {isFr
                  ? "⚠ Votre pseudo sera visible par les autres utilisateurs sur le classement sectoriel."
                  : "⚠ Your nickname will be visible to other users on the industry leaderboard."}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                {isFr
                  ? "Laissez vide pour ne pas apparaître sur le classement."
                  : "Leave blank to stay off the leaderboard."}
              </p>
            </div>
            {nicknameError && <p className="text-sm text-red-400">{nicknameError}</p>}
            <button
              type="submit"
              disabled={nicknameSaving}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-50 transition"
            >
              {nicknameSaved ? (
                <><Check className="h-4 w-4" /> {isFr ? "Enregistré" : "Saved"}</>
              ) : nicknameSaving ? (isFr ? "Enregistrement…" : "Saving…") : (isFr ? "Enregistrer le pseudo" : "Save nickname")}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2">
              <Lock className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="font-bold text-lg">{isFr ? "Mot de passe" : "Password"}</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{isFr ? "Mot de passe actuel" : "Current password"}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{isFr ? "Nouveau mot de passe" : "New password"}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">{isFr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                placeholder="••••••••"
              />
            </div>
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            <button
              type="submit"
              disabled={passwordSaving}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              {passwordSaved ? (
                <><Check className="h-4 w-4" /> {isFr ? "Mot de passe mis à jour" : "Password updated"}</>
              ) : passwordSaving ? (isFr ? "Mise à jour…" : "Updating…") : (isFr ? "Mettre à jour" : "Update password")}
            </button>
          </form>
        </section>

        {/* Subscription */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2">
              <CreditCard className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="font-bold text-lg">{isFr ? "Abonnement" : "Subscription"}</h2>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a2135] p-4 mb-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">{isFr ? "Formule actuelle" : "Current plan"}</p>
              <div className="flex items-center gap-2">
                {isActive ? (
                  <>
                    <Zap className="h-4 w-4 text-violet-400" />
                    <span className="font-bold text-violet-300">Lite</span>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">{isFr ? "Actif" : "Active"}</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold">{isFr ? "Gratuit" : "Free"}</span>
                    <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                      {isFr ? `${sessionCount}/2 sessions utilisées` : `${sessionCount}/2 sessions used`}
                    </span>
                  </>
                )}
              </div>
            </div>
            {isActive ? (
              <span className="text-lg font-bold text-white">£3.99<span className="text-sm font-normal text-slate-400">/mo</span></span>
            ) : (
              <span className="text-lg font-bold text-white">£0</span>
            )}
          </div>

          {isActive ? (
            <>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 transition"
              >
                {portalLoading ? (isFr ? "Ouverture du portail…" : "Opening portal…") : (isFr ? "Gérer la facturation →" : "Manage billing →")}
              </button>
              {portalError && (
                <p className="mt-2 text-sm text-red-400">{portalError}</p>
              )}
            </>
          ) : (
            <a
              href="/pricing"
              className="block w-full rounded-xl bg-violet-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              {isFr ? "Passer à Lite — £3.99/mois" : "Upgrade to Lite — £3.99/month"}
            </a>
          )}
        </section>

        {/* Pilot code */}
        {!isActive && !isPilot && (
          <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/20 p-2">
                <Tag className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{isFr ? "Utiliser un code pilote" : "Redeem a pilot code"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isFr
                    ? "Vous avez un code de votre organisation ? Saisissez-le ici pour 1 mois d'accès gratuit."
                    : "Have a code from your organisation? Enter it here for 1 month of free access."}
                </p>
              </div>
            </div>
            <form onSubmit={handlePilotRedeem} className="flex gap-3">
              <input
                value={pilotCode}
                onChange={(e) => setPilotCode(e.target.value.toUpperCase())}
                placeholder="e.g. TOASTMASTERS2026"
                className="flex-1 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 font-mono"
              />
              <button
                type="submit"
                disabled={pilotLoading || !pilotCode.trim()}
                className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
              >
                {pilotLoading ? "…" : (isFr ? "Appliquer" : "Apply")}
              </button>
            </form>
            {pilotError && <p className="mt-3 text-sm text-red-400">{pilotError}</p>}
            {pilotSuccess && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                <Check className="h-4 w-4 shrink-0" />
                {pilotSuccess}
              </div>
            )}
          </section>
        )}

        {isPilot && (
          <section className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/20 p-2">
                <Tag className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-green-300">{isFr ? "Accès pilote actif" : "Pilot access active"}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {presenter.pilotOrgName && `${presenter.pilotOrgName} · `}
                  {isFr ? "Expire le " : "Expires "}
                  {presenter.pilotExpiresAt?.toDate().toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Language */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-sky-500/10 p-2">
              <Globe className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Language / Langue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFr
                  ? "Les ressources et emails seront fournis dans la langue choisie."
                  : "Resources and emails will be served in your chosen language."}
              </p>
            </div>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-[#0f1424] p-1">
            <button
              onClick={() => handleSaveLocale("en")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${locale === "en" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              English
            </button>
            <button
              onClick={() => handleSaveLocale("fr")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${locale === "fr" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Français
            </button>
          </div>
          {(localeSaving || localeSaved) && (
            <p className="text-xs text-sky-400 flex items-center gap-1">
              {localeSaved ? <><Check className="h-3 w-3" /> {isFr ? "Enregistré" : "Saved"}</> : (isFr ? "Enregistrement…" : "Saving…")}
            </p>
          )}
        </section>

        {/* Sign out */}
        <button
          onClick={async () => { await signOut(auth); router.replace("/"); }}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-5 py-4 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition"
        >
          <LogOut className="h-4 w-4" />
          {isFr ? "Se déconnecter" : "Sign out"}
        </button>

      </div>
    </main>
  );
}
