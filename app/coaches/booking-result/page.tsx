"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

const OUTCOMES: Record<string, {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}> = {
  confirmed: {
    icon: <CheckCircle className="w-12 h-12 text-green-400" />,
    title: "Call confirmed!",
    body: "A calendar invite has been sent to both you and the user. They'll receive the meeting link in the confirmation email.",
    ctaHref: "/admin/coaches",
    ctaLabel: "Go to coach admin",
  },
  declined: {
    icon: <XCircle className="w-12 h-12 text-slate-400" />,
    title: "Request declined",
    body: "The user has been notified and can browse the roster to find another coach.",
    ctaHref: "/admin/coaches",
    ctaLabel: "Go to coach admin",
  },
  already_actioned: {
    icon: <Clock className="w-12 h-12 text-amber-400" />,
    title: "Already actioned",
    body: "This request has already been confirmed or declined. No further action is needed.",
    ctaHref: "/coaches",
    ctaLabel: "Browse coaches",
  },
  expired: {
    icon: <Clock className="w-12 h-12 text-amber-400" />,
    title: "Link expired",
    body: "This action link has expired (72 hours). The request has been marked as expired and the user notified.",
    ctaHref: "/coaches",
    ctaLabel: "Browse coaches",
  },
  invalid_token: {
    icon: <AlertCircle className="w-12 h-12 text-red-400" />,
    title: "Invalid link",
    body: "This link is not valid. Please check the email and try again.",
    ctaHref: "/coaches",
    ctaLabel: "Browse coaches",
  },
};

const DEFAULT_OUTCOME = {
  icon: <AlertCircle className="w-12 h-12 text-red-400" />,
  title: "Something went wrong",
  body: "We couldn't process this action. Please try again or contact support.",
  ctaHref: "/coaches",
  ctaLabel: "Browse coaches",
};

function BookingResultContent() {
  const searchParams = useSearchParams();
  const outcome = searchParams.get("outcome") ?? "";
  const data = OUTCOMES[outcome] ?? DEFAULT_OUTCOME;

  return (
    <div className="min-h-screen bg-[#05070d] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{data.icon}</div>
        <h1 className="text-2xl font-bold text-white mb-3">{data.title}</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">{data.body}</p>
        <Link
          href={data.ctaHref}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {data.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function BookingResultPage() {
  return (
    <Suspense>
      <BookingResultContent />
    </Suspense>
  );
}
