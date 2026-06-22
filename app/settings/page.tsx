"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, Lock, CreditCard, Check, Zap } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface PresenterData {
  displayName?: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
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

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? user.email?.split("@")[0] ?? "");

    getDoc(doc(db, "presenters", user.uid)).then((snap) => {
      if (snap.exists()) setPresenter(snap.data() as PresenterData);
    });

    // Count sessions for free tier display
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
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      setProfileError("Failed to save. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
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
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError("Failed to update password. Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleManageBilling() {
    if (!presenter.stripeCustomerId) return;
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: presenter.stripeCustomerId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setPortalLoading(false);
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  const isActive = presenter.subscriptionStatus === "active";

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <header className="border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-slate-400">Manage your account and subscription.</p>
          </div>
          <a href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Dashboard
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
            <h2 className="font-bold text-lg">Profile</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Email address</label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-slate-500 outline-none cursor-not-allowed"
              />
            </div>
            {profileError && <p className="text-sm text-red-400">{profileError}</p>}
            <button
              type="submit"
              disabled={profileSaving}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
            >
              {profileSaved ? (
                <><Check className="h-4 w-4" /> Saved</>
              ) : profileSaving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2">
              <Lock className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="font-bold text-lg">Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Current password</label>
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
              <label className="mb-1.5 block text-sm text-slate-400">New password</label>
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
              <label className="mb-1.5 block text-sm text-slate-400">Confirm new password</label>
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
                <><Check className="h-4 w-4" /> Password updated</>
              ) : passwordSaving ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

        {/* Subscription */}
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2">
              <CreditCard className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="font-bold text-lg">Subscription</h2>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a2135] p-4 mb-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Current plan</p>
              <div className="flex items-center gap-2">
                {isActive ? (
                  <>
                    <Zap className="h-4 w-4 text-violet-400" />
                    <span className="font-bold text-violet-300">Lite</span>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Active</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold">Free</span>
                    <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                      {sessionCount}/2 sessions used
                    </span>
                  </>
                )}
              </div>
            </div>
            {isActive ? (
              <span className="text-lg font-bold text-white">£1.99<span className="text-sm font-normal text-slate-400">/mo</span></span>
            ) : (
              <span className="text-lg font-bold text-white">£0</span>
            )}
          </div>

          {isActive ? (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 transition"
            >
              {portalLoading ? "Opening portal…" : "Manage billing →"}
            </button>
          ) : (
            <a
              href="/pricing"
              className="block w-full rounded-xl bg-violet-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-violet-400 transition"
            >
              Upgrade to Lite — £1.99/month
            </a>
          )}
        </section>

      </div>
    </main>
  );
}
