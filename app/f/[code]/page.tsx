"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Clock, Loader2 } from "lucide-react";

interface CodeInfo {
  inWindow: boolean;
  consumerCode: string | null;
  status: string;
  title: string;
  orgName: string | null;
  scheduledStart: string | null;
  error?: string;
}

export default function FeedbackRedirectPage() {
  const params = useParams();
  const code = (params?.code as string ?? "").toUpperCase();
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/f/${code}`)
      .then((r) => r.json())
      .then((data: CodeInfo) => {
        if (data.inWindow && data.consumerCode) {
          // Redirect directly to the full consumer feedback experience
          window.location.replace(`/session/${data.consumerCode}`);
        } else {
          setInfo(data);
          setLoading(false);
        }
      })
      .catch(() => {
        setInfo({ inWindow: false, consumerCode: null, status: "error", title: "", orgName: null, scheduledStart: null });
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </main>
    );
  }

  if (!info || info.error === "not_found") {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg mb-2">Session not found</h1>
          <p className="text-slate-400 text-sm">Check the link or QR code and try again.</p>
        </div>
      </main>
    );
  }

  if (info.status === "completed" || info.status === "cancelled" || (!info.inWindow && info.scheduledStart && new Date(info.scheduledStart).getTime() < Date.now())) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🎤</div>
          <h1 className="text-white font-bold text-lg mb-2">This session has ended</h1>
          <p className="text-slate-400 text-sm mb-6">
            The presenter has closed feedback for this session. Thanks for attending!
          </p>
          <a
            href="/try?ref=feedback"
            className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            See your own presenter score →
          </a>
        </div>
      </main>
    );
  }

  // Not yet in window — show countdown/start time
  const startTime = info.scheduledStart ? new Date(info.scheduledStart) : null;
  const startStr = startTime
    ? startTime.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-violet-600/20 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-7 h-7 text-violet-400" />
        </div>
        {info.orgName && (
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">{info.orgName}</p>
        )}
        <h1 className="text-white font-bold text-xl mb-2">{info.title || "Session not started yet"}</h1>
        {startStr ? (
          <p className="text-slate-400 text-sm">
            Feedback opens shortly before <strong className="text-slate-200">{startStr}</strong>.
            Come back then to rate this session.
          </p>
        ) : (
          <p className="text-slate-400 text-sm">Feedback isn&apos;t open yet. The presenter will open it when the session starts.</p>
        )}
        <p className="text-slate-600 text-xs mt-6">Powered by LearnFast</p>
      </div>
    </main>
  );
}
