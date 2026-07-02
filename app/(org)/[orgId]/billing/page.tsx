"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Loader2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";

interface OrgInfo {
  name: string;
  seats: { purchased: number; used: number };
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
}

interface ProratedPreview {
  currentSeats: number;
  newSeats: number;
  proratedAmountPence: number;
  proratedAmountFormatted: string;
  isCredit: boolean;
  nextInvoiceTotalFormatted: string;
  nextInvoiceDue: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trialing:  { label: "Trial",    color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  active:    { label: "Active",   color: "text-green-400 bg-green-400/10 border-green-400/20" },
  past_due:  { label: "Past due", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  cancelled: { label: "Cancelled",color: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
};

export default function BillingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat adjustment state
  const [newSeats, setNewSeats] = useState<number>(0);
  const [preview, setPreview] = useState<ProratedPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Checkout state
  const [checkoutInterval, setCheckoutInterval] = useState<"monthly" | "annual">("monthly");
  const [checkingOut, setCheckingOut] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const successParam = searchParams?.get("success");
  const cancelledParam = searchParams?.get("cancelled");

  const fetchOrgInfo = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };
      const [infoRes, membersRes] = await Promise.all([
        fetch(`/api/org/${orgId}/info`, { headers }),
        fetch(`/api/org/${orgId}/members-list`, { headers }),
      ]);
      if (infoRes.status === 401) { router.replace("/auth/login"); return; }
      if (!infoRes.ok) {
        const errData = await infoRes.json().catch(() => ({}));
        // If the URL orgId is wrong, redirect to the correct org's billing page
        if (errData.error === "wrong_org" && errData.yourOrgId) {
          router.replace(`/${errData.yourOrgId}/billing`);
          return;
        }
        setError(`Unable to load billing (${errData.error ?? infoRes.status}). Check you are a member of this organisation.`);
        return;
      }

      const infoData = await infoRes.json();
      setOrgInfo(infoData);
      setNewSeats(infoData.seats.purchased);
      // info route now returns myRole — use as fallback if members-list is restricted
      if (membersRes.ok) {
        const d = await membersRes.json();
        setMyRole(d.myRole);
      } else {
        setMyRole(infoData.myRole ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchOrgInfo();
  }, [user, authLoading, fetchOrgInfo, router]);

  async function fetchPreview(seats: number) {
    if (!user || !orgInfo?.stripeSubscriptionId || seats === orgInfo.seats.purchased) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/billing/seats?seats=${seats}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setPreview(await res.json());
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleSeatChange(delta: number) {
    const next = Math.max((orgInfo?.seats.used ?? 5), Math.min(50, newSeats + delta));
    setNewSeats(next);
    fetchPreview(next);
  }

  async function confirmSeatUpdate() {
    if (!user) return;
    setUpdating(true);
    setUpdateError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/org/${orgId}/billing/seats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ seats: newSeats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.error === "seats_below_usage"
          ? `You have ${data.used} active members — you can't go below that.`
          : "Failed to update seats. Please try again.");
        return;
      }
      setPreview(null);
      fetchOrgInfo();
    } finally {
      setUpdating(false);
    }
  }

  async function startCheckout() {
    if (!user) return;
    setCheckingOut(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/enterprise-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orgId, interval: checkoutInterval }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } finally {
      setCheckingOut(false);
    }
  }

  async function openPortal() {
    if (!user || !orgInfo?.stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/org/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.open(data.url, "_blank");
    } finally {
      setPortalLoading(false);
    }
  }

  const isOwner = myRole === "owner";

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#0f172a] border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Unable to load billing</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button onClick={() => router.replace("/dashboard")}
            className="mt-6 text-sm text-violet-400 hover:text-violet-300 underline">
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!orgInfo) return null;

  const trialDaysLeft = orgInfo.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(orgInfo.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusStyle = STATUS_LABEL[orgInfo.subscriptionStatus] ?? STATUS_LABEL.active;
  const hasSubscription = !!orgInfo.stripeSubscriptionId;
  const seatPct = orgInfo.seats.purchased > 0
    ? (orgInfo.seats.used / orgInfo.seats.purchased) * 100
    : 0;

  return (
    <main className="min-h-screen bg-[#05070d]">
      <MobileNav />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
            {orgInfo.name}
          </p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-slate-400" />
            Billing
          </h1>
        </div>

        {/* Success / cancelled banners */}
        {successParam && (
          <div className="mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">Subscription activated. Welcome to LearnFast Enterprise!</p>
          </div>
        )}
        {cancelledParam && (
          <div className="mb-6 flex items-center gap-3 bg-slate-500/10 border border-slate-500/20 rounded-xl p-4">
            <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-slate-300 text-sm">Checkout cancelled. No charge was made.</p>
          </div>
        )}

        {/* Past-due banner */}
        {orgInfo.subscriptionStatus === "past_due" && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-semibold">Payment failed</p>
              <p className="text-red-400/80 text-sm mt-1">
                Update your payment method to keep your organisation active. Access will be restricted if not resolved.
              </p>
              {isOwner && (
                <button onClick={openPortal} disabled={portalLoading}
                  className="mt-3 text-sm text-red-300 underline">
                  Update payment method →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Plan</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
          </div>

          <p className="text-2xl font-bold text-white mb-1">Enterprise</p>
          <p className="text-slate-400 text-sm mb-4">£15/seat/month · billed monthly</p>

          {orgInfo.subscriptionStatus === "trialing" && trialDaysLeft !== null && (
            <div className="flex items-center gap-2 text-amber-300 text-sm mb-4">
              <Clock className="w-4 h-4" />
              <span>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining in trial</span>
            </div>
          )}

          {/* Checkout CTA — shown when trialing and owner */}
          {orgInfo.subscriptionStatus === "trialing" && isOwner && (
            <div className="border-t border-[#1e293b] pt-4 mt-4">
              <p className="text-sm text-slate-400 mb-3">Subscribe now to avoid interruption when your trial ends.</p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setCheckoutInterval("monthly")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    checkoutInterval === "monthly"
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-transparent border-[#1e293b] text-slate-400"
                  }`}
                >
                  Monthly · £15/seat
                </button>
                <button
                  onClick={() => setCheckoutInterval("annual")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    checkoutInterval === "annual"
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-transparent border-[#1e293b] text-slate-400"
                  }`}
                >
                  Annual · £12/seat <span className="text-green-400">Save 20%</span>
                </button>
              </div>
              <button
                onClick={startCheckout}
                disabled={checkingOut}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {checkingOut ? "Redirecting to checkout…" : `Subscribe — £${checkoutInterval === "monthly" ? orgInfo.seats.purchased * 15 : orgInfo.seats.purchased * 12 * 12}/` + (checkoutInterval === "monthly" ? "mo" : "yr")}
              </button>
            </div>
          )}

          {/* Stripe portal link — shown when active subscription */}
          {hasSubscription && isOwner && (
            <div className="border-t border-[#1e293b] pt-4 mt-4">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {portalLoading ? "Opening…" : "Manage payment method & invoices →"}
              </button>
            </div>
          )}
        </div>

        {/* Seats card */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Seats
            </h2>
            <span className="text-slate-400 text-sm">{orgInfo.seats.used} used of {orgInfo.seats.purchased}</span>
          </div>

          <div className="w-full h-2 bg-[#1e293b] rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full ${seatPct >= 90 ? "bg-red-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min(seatPct, 100)}%` }}
            />
          </div>

          {/* Seat adjustment — only when active subscription and owner */}
          {hasSubscription && isOwner && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Adjust seats (5–50):</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSeatChange(-1)}
                  disabled={newSeats <= orgInfo.seats.used}
                  className="w-9 h-9 rounded-lg border border-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-2xl font-bold text-white w-8 text-center">{newSeats}</span>
                <button
                  onClick={() => handleSeatChange(1)}
                  disabled={newSeats >= 50}
                  className="w-9 h-9 rounded-lg border border-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                {newSeats !== orgInfo.seats.purchased && (
                  <span className="text-xs text-slate-500 ml-1">
                    {newSeats > orgInfo.seats.purchased ? `+${newSeats - orgInfo.seats.purchased}` : newSeats - orgInfo.seats.purchased} seats
                  </span>
                )}
              </div>

              {/* Proration preview */}
              {previewLoading && (
                <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating proration…
                </div>
              )}
              {preview && !previewLoading && newSeats !== orgInfo.seats.purchased && (
                <div className="mt-4 bg-[#0a0f1a] border border-[#1e293b] rounded-xl p-4 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prorated {preview.isCredit ? "credit" : "charge"} now</span>
                    <span className={preview.isCredit ? "text-green-400" : "text-white"}>
                      {preview.isCredit ? "-" : ""}{preview.proratedAmountFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next invoice total</span>
                    <span className="text-white">{preview.nextInvoiceTotalFormatted}</span>
                  </div>
                  {preview.nextInvoiceDue && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due</span>
                      <span className="text-slate-300">
                        {new Date(preview.nextInvoiceDue).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={confirmSeatUpdate}
                      disabled={updating}
                      className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2 rounded-xl text-sm transition-colors"
                    >
                      {updating ? "Updating…" : `Confirm — ${newSeats} seats`}
                    </button>
                    {updateError && <p className="text-red-400 text-xs mt-2">{updateError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {newSeats >= 50 && (
            <p className="text-sm text-slate-400 mt-3">
              Need more than 50 seats?{" "}
              <a href="mailto:hello@learnfastapp.com" className="text-violet-400 underline">Contact us</a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
