"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Building2, Users, ChevronRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

const MIN_SEATS = 5;
const MAX_SEATS = 50;

type Step = "account" | "org";
type AuthMode = "signup" | "signin";

export default function OrgSignupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("account");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  // Org fields
  const [orgName, setOrgName] = useState("");
  const [seats, setSeats] = useState(10);
  const [orgError, setOrgError] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);

  // If already signed in, skip to org step
  useEffect(() => {
    if (!authLoading && user) {
      setStep("org");
    }
  }, [user, authLoading]);

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError("");
    setAccountLoading(true);
    try {
      if (authMode === "signup") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setStep("org");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        setAccountError("An account with this email already exists. Sign in instead.");
        setAuthMode("signin");
      } else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setAccountError("Incorrect email or password.");
      } else if (code === "auth/weak-password") {
        setAccountError("Password must be at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setAccountError("Please enter a valid email address.");
      } else {
        setAccountError("Something went wrong. Please try again.");
      }
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setOrgError("");
    setOrgLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: orgName.trim(), seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_in_org") {
          setOrgError("This account is already part of an organisation.");
        } else if (data.error === "invalid_seats") {
          setOrgError(`Seat count must be between ${data.min} and ${data.max}.`);
        } else {
          setOrgError("Something went wrong. Please try again.");
        }
        return;
      }
      router.replace(`/${data.orgId}/members`);
    } catch {
      setOrgError("Network error. Please try again.");
    } finally {
      setOrgLoading(false);
    }
  }

  const monthlyCost = seats * 15;
  const annualCost = seats * 12 * 12;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
        <a href="/enterprise" className="flex items-center gap-2">
          <Image src="/icon-mark.png" alt="LearnFast" width={26} height={19} />
          <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span>
            <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </a>
        <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Enterprise</span>
      </header>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 text-sm font-semibold ${step === "account" ? "text-white" : "text-emerald-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${step === "account" ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-emerald-500 bg-emerald-500/20 text-emerald-400"}`}>
                {step === "org" ? "✓" : "1"}
              </span>
              Create account
            </div>
            <div className="flex-1 h-px bg-[#1e293b]" />
            <div className={`flex items-center gap-2 text-sm font-semibold ${step === "org" ? "text-white" : "text-slate-500"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${step === "org" ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-slate-700 text-slate-600"}`}>
                2
              </span>
              Set up organisation
            </div>
          </div>

          {/* Step 1: Account */}
          {step === "account" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-1">
                  {authMode === "signup" ? "Create your account" : "Sign in to continue"}
                </h1>
                <p className="text-sm text-slate-400">
                  {authMode === "signup"
                    ? "Start your 14-day free enterprise trial — no card required."
                    : "Sign in to set up your organisation."}
                </p>
              </div>

              <form onSubmit={handleAccount} className="space-y-4">
                {authMode === "signup" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Work email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                    className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {accountError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-sm">{accountError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={accountLoading}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {accountLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : authMode === "signup" ? "Continue" : "Sign in"}
                  {!accountLoading && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                {authMode === "signup" ? (
                  <>Already have an account?{" "}
                    <button onClick={() => { setAuthMode("signin"); setAccountError(""); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                      Sign in
                    </button>
                  </>
                ) : (
                  <>No account yet?{" "}
                    <button onClick={() => { setAuthMode("signup"); setAccountError(""); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                      Create one
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Step 2: Org setup */}
          {step === "org" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-1">Set up your organisation</h1>
                <p className="text-sm text-slate-400">
                  14-day free trial — no charge until your trial ends.
                </p>
              </div>

              <form onSubmit={handleOrg} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Organisation name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    minLength={2}
                    maxLength={60}
                    className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Number of seats
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={MIN_SEATS}
                      max={MAX_SEATS}
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                      className="flex-1 accent-violet-500"
                    />
                    <div className="w-14 text-center">
                      <span className="text-2xl font-bold">{seats}</span>
                    </div>
                  </div>
                  <div className="mt-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex justify-between text-sm">
                    <div>
                      <p className="text-slate-400">Monthly</p>
                      <p className="text-white font-semibold mt-0.5">£{monthlyCost.toLocaleString()}/mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">Annual (save 20%)</p>
                      <p className="text-white font-semibold mt-0.5">£{annualCost.toLocaleString()}/yr</p>
                    </div>
                  </div>
                  {seats >= MAX_SEATS && (
                    <p className="mt-2 text-sm text-slate-400">
                      Need more than {MAX_SEATS} seats?{" "}
                      <a href="mailto:hello@learnfastapp.com" className="text-violet-400 underline">
                        Contact us
                      </a>
                    </p>
                  )}
                </div>

                {orgError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-sm">{orgError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={orgLoading || !orgName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {orgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start 14-day trial"}
                  {!orgLoading && <ChevronRight className="w-4 h-4" />}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Card required after trial. Cancel anytime.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
