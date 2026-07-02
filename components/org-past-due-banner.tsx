"use client";

import { AlertCircle } from "lucide-react";

interface OrgPastDueBannerProps {
  subscriptionStatus: string;
  orgId: string;
  isOwner: boolean;
}

export default function OrgPastDueBanner({ subscriptionStatus, orgId, isOwner }: OrgPastDueBannerProps) {
  if (subscriptionStatus !== "past_due") return null;

  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-300 font-medium">Payment failed</p>
        <p className="text-xs text-red-400/80 mt-0.5">
          Your organisation will lose access if payment is not resolved.
          {isOwner && (
            <>
              {" "}
              <a href={`/${orgId}/billing`} className="underline text-red-300">
                Update billing →
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
