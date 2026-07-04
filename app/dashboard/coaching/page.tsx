"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Clock, ExternalLink, Loader2, Video, XCircle,
} from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface CallSlot {
  start: { toDate: () => Date } | null;
  end: { toDate: () => Date } | null;
}

interface DiscoveryCall {
  id: string;
  coachId: string;
  coachSlug: string;
  coachName: string;
  status: string;
  requestedSlots: CallSlot[];
  confirmedSlot: CallSlot | null;
  userNote: string;
  meetingUrl: string | null;
  icsUid: string;
  createdAt: { toDate: () => Date } | null;
}

const STATUS_CHIP: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  confirmed: "bg-green-500/15 text-green-400 border-green-500/30",
  declined: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  expired: "bg-slate-500/15 text-slate-500 border-slate-600/30",
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
  expired: "Expired",
};

function formatDate(d: Date, tz?: string): string {
  return d.toLocaleString("en-GB", {
    timeZone: tz ?? "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CallCard({
  call,
  userTimezone,
  onCancel,
}: {
  call: DiscoveryCall;
  userTimezone: string;
  onCancel: (id: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const canCancel = call.status === "requested" || call.status === "confirmed";

  async function handleCancel() {
    if (!window.confirm("Cancel this discovery call request?")) return;
    setCancelling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/coaches/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ callId: call.id }),
      });
      onCancel(call.id);
    } catch {
      // fail silently
    } finally {
      setCancelling(false);
    }
  }

  const chipClass = STATUS_CHIP[call.status] ?? STATUS_CHIP.expired;
  const statusLabel = STATUS_LABEL[call.status] ?? call.status;

  const confirmedStart = call.confirmedSlot?.start?.toDate();

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link
            href={`/coaches/${call.coachSlug}`}
            className="text-white font-semibold hover:text-violet-300 transition-colors"
          >
            {call.coachName}
          </Link>
          <p className="text-slate-500 text-xs mt-0.5">
            Requested {call.createdAt ? formatDate(call.createdAt.toDate(), userTimezone) : "—"}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${chipClass}`}>
          {statusLabel}
        </span>
      </div>

      {call.status === "confirmed" && confirmedStart && (
        <div className="bg-[#0a0f1a] border border-[#1e293b] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Confirmed</span>
          </div>
          <p className="text-white text-sm font-semibold mb-1">
            {formatDate(confirmedStart, userTimezone)}
          </p>
          <p className="text-slate-500 text-xs mb-3">
            {call.confirmedSlot?.end?.toDate()
              ? `Until ${call.confirmedSlot.end.toDate().toLocaleString("en-GB", { timeZone: userTimezone, hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
          {call.meetingUrl && (
            <a
              href={call.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Video className="w-4 h-4" /> Join meeting
            </a>
          )}
        </div>
      )}

      {call.status === "requested" && (
        <div className="mb-4">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Proposed times</p>
          <div className="space-y-1">
            {call.requestedSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {slot.start ? formatDate(slot.start.toDate(), userTimezone) : "—"}
              </div>
            ))}
          </div>
        </div>
      )}

      {call.userNote && (
        <p className="text-slate-500 text-xs italic mb-4 line-clamp-2">
          &ldquo;{call.userNote}&rdquo;
        </p>
      )}

      <div className="flex items-center gap-3">
        <Link
          href={`/coaches/${call.coachSlug}`}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View coach
        </Link>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors disabled:opacity-50"
          >
            {cancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            Cancel request
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardCoachingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<DiscoveryCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth?redirect=/dashboard/coaching");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "discoveryCalls"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setCalls(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiscoveryCall)));
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function handleCancel(callId: string) {
    setCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, status: "cancelled" } : c))
    );
  }

  const active = calls.filter((c) => ["requested", "confirmed"].includes(c.status));
  const past = calls.filter((c) => !["requested", "confirmed"].includes(c.status));

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">My coaching calls</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <h2 className="text-white font-semibold text-lg mb-2">No coaching calls yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Browse our curated roster and book a free discovery call with an executive coach.
            </p>
            <Link
              href="/coaches"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Browse coaches
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  Active ({active.length})
                </h2>
                <div className="space-y-4">
                  {active.map((c) => (
                    <CallCard key={c.id} call={c} userTimezone={userTimezone} onCancel={handleCancel} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  Past
                </h2>
                <div className="space-y-4">
                  {past.map((c) => (
                    <CallCard key={c.id} call={c} userTimezone={userTimezone} onCancel={handleCancel} />
                  ))}
                </div>
              </section>
            )}

            <div className="pt-4 text-center">
              <Link
                href="/coaches"
                className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
              >
                Browse more coaches →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
