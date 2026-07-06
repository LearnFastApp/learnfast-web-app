"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function TrialBanner({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) =>
      fetch(`/api/org/${orgId}/info`, { headers: { Authorization: `Bearer ${token}` } })
    ).then((r) => r.json()).then((data) => {
      if (data.subscriptionStatus !== "trialing" || !data.trialEndsAt) return;
      const days = Math.max(0, Math.ceil(
        (new Date(data.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));
      setDaysLeft(days);
    }).catch(() => {});
  }, [user, orgId]);

  if (daysLeft === null) return null;

  return (
    <div className="fixed top-14 md:top-0 left-0 md:left-60 right-0 z-30 flex items-center justify-between gap-4 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-amber-400">
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          {daysLeft === 0
            ? "Your trial ends today."
            : daysLeft === 1
            ? "1 day remaining in your trial."
            : `${daysLeft} days remaining in your trial.`}
        </span>
      </div>
      <a
        href={`/${orgId}/billing`}
        className="shrink-0 text-amber-400 font-semibold hover:text-amber-300 transition underline underline-offset-2"
      >
        Subscribe →
      </a>
    </div>
  );
}
