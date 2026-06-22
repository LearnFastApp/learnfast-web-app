"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Copy, Check, Users, PenLine, PlayCircle, Headphones, FileText, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import PresenterReflectionModal from "@/components/presenter-reflection-modal";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface FeedbackResponse {
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
}

interface PresenterReflection {
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  engagement: "Engagement",
  energy: "Energy",
  understanding: "Understanding",
  connection: "Connection",
};

const RECOMMENDATIONS: Record<Dimension, { title: string; description: string }> = {
  clarity: {
    title: "Improving Clarity",
    description: "Your audience found it harder to follow your message. These resources will help you structure ideas and communicate with precision.",
  },
  engagement: {
    title: "Improving Engagement",
    description: "Your audience felt less captivated during this session. Explore these resources on audience engagement techniques.",
  },
  energy: {
    title: "Improving Energy",
    description: "Your energy levels could have been higher. These resources cover presence, vocal variety, and delivery techniques.",
  },
  understanding: {
    title: "Improving Understanding",
    description: "Some of your message didn't land as clearly as intended. These resources focus on explanation and knowledge transfer.",
  },
  connection: {
    title: "Improving Connection",
    description: "Building rapport with your audience is key. These resources will help you create stronger human connection when presenting.",
  },
};

function getLowestDimension(averages: Record<Dimension, number>): Dimension | null {
  const dims = Object.entries(averages) as [Dimension, number][];
  if (dims.every(([, v]) => v === 0)) return null;
  return dims.reduce((lowest, current) => current[1] < lowest[1] ? current : lowest)[0];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<{ title: string; code: string } | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [reflection, setReflection] = useState<PresenterReflection | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }

    getDoc(doc(db, "sessions", id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession({ title: data.title, code: data.code });
      }
    });

    const q = query(collection(db, "feedback_responses"), where("sessionId", "==", id));
    const unsubFeedback = onSnapshot(q, (snap) => {
      setResponses(snap.docs.map((d) => d.data() as FeedbackResponse));
    });

    const unsubReflection = onSnapshot(doc(db, "presenter_reflections", id), (snap) => {
      if (snap.exists()) setReflection(snap.data() as PresenterReflection);
    });

    return () => { unsubFeedback(); unsubReflection(); };
  }, [id, user, authLoading, router]);

  const audienceAverages = DIMENSIONS.reduce(
    (acc, dim) => ({ ...acc, [dim]: average(responses.map((r) => r[dim])) }),
    {} as Record<Dimension, number>
  );

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    audience: audienceAverages[dim],
    presenter: reflection ? reflection[dim] : null,
    fullMark: 100,
  }));

  const feedbackUrl = session ? `${window.location.origin}/session/${session.code}` : "";

  function copyUrl() {
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading || !session) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      {showReflection && user && (
        <PresenterReflectionModal
          sessionId={id}
          presenterId={user.uid}
          onClose={() => setShowReflection(false)}
          onSubmitted={() => setShowReflection(false)}
        />
      )}

      <header className="border-b border-white/10 bg-[#101523] px-6 py-5 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{session.title}</h1>
          <p className="text-xs text-slate-400">
            Code: <span className="font-mono font-bold text-white">{session.code}</span>
            {" · "}
            <span className="text-green-400">● Live</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4" />
            <span className="text-sm font-semibold text-white">{responses.length}</span>
          </div>
          <button
            onClick={() => setShowReflection(true)}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20"
          >
            <PenLine className="h-4 w-4" />
            {reflection ? "Edit reflection" : "Rate yourself"}
          </button>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Live averages</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500 inline-block" />
                  <span className="text-slate-400">Audience</span>
                </span>
                {reflection && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block" />
                    <span className="text-slate-400">Your reflection</span>
                  </span>
                )}
              </div>
            </div>

            {responses.length === 0 && !reflection ? (
              <div className="flex h-64 items-center justify-center text-slate-500">
                Waiting for responses…
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "#94a3b8", fontSize: 13 }}
                    />
                    {responses.length > 0 && (
                      <Radar
                        name="Audience"
                        dataKey="audience"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    {reflection && (
                      <Radar
                        name="Your reflection"
                        dataKey="presenter"
                        stroke="#22d3ee"
                        fill="#22d3ee"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        strokeDasharray="5 3"
                      />
                    )}
                  </RadarChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-5 gap-3">
                  {DIMENSIONS.map((dim) => (
                    <div key={dim} className="text-center">
                      <p className="text-xs text-slate-400 capitalize mb-1">{dim}</p>
                      <p className="text-xl font-bold text-violet-300">{audienceAverages[dim]}</p>
                      {reflection && (
                        <p className="text-sm font-semibold text-cyan-400">{reflection[dim]}</p>
                      )}
                      <p className="text-xs text-slate-500">/100</p>
                    </div>
                  ))}
                </div>

                {reflection && responses.length > 0 && (
                  <div className="mt-6 rounded-xl bg-[#1a2135] p-4">
                    <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Gap analysis</p>
                    <div className="grid grid-cols-5 gap-3">
                      {DIMENSIONS.map((dim) => {
                        const gap = reflection[dim] - audienceAverages[dim];
                        const color = gap > 0 ? "text-amber-400" : gap < 0 ? "text-green-400" : "text-slate-400";
                        return (
                          <div key={dim} className="text-center">
                            <p className="text-xs text-slate-500 capitalize mb-1">{dim}</p>
                            <p className={`text-sm font-bold ${color}`}>
                              {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Amber = you rated yourself higher than the audience · Green = audience rated you higher
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            const lowest = getLowestDimension(audienceAverages);
            if (!lowest || responses.length === 0) return null;
            const rec = RECOMMENDATIONS[lowest];
            return (
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-[#111827] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wider">
                    Recommended focus
                  </h2>
                </div>
                <p className="mb-1 font-bold text-white">{rec.title}</p>
                <p className="mb-4 text-xs text-slate-400 leading-relaxed">{rec.description}</p>

                <div className="space-y-2">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-slate-300 hover:border-violet-500/40 hover:text-white transition"
                  >
                    <PlayCircle className="h-4 w-4 text-violet-400 shrink-0" />
                    <span>How to improve {DIMENSION_LABELS[lowest]} — Video</span>
                  </a>

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-slate-300 hover:border-violet-500/40 hover:text-white transition"
                  >
                    <Headphones className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>How to improve {DIMENSION_LABELS[lowest]} — Podcast</span>
                  </a>

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2135] px-4 py-3 text-sm text-slate-300 hover:border-violet-500/40 hover:text-white transition"
                  >
                    <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>How to improve {DIMENSION_LABELS[lowest]} — PDF Guide</span>
                  </a>
                </div>

                <p className="mt-3 text-xs text-slate-500 text-center">
                  Based on lowest audience score · {DIMENSION_LABELS[lowest]}: {audienceAverages[lowest]}/100
                </p>
              </div>
            );
          })()}

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Share with audience
            </h2>
            <div className="flex justify-center rounded-xl bg-white p-4 mb-4">
              <QRCodeCanvas value={feedbackUrl} size={160} id="qr-display" />
            </div>
            {/* Hidden high-res canvas for download */}
            <div className="hidden">
              <QRCodeCanvas value={feedbackUrl} size={512} id="qr-download" />
            </div>
            <div className="rounded-xl bg-[#1a2135] px-4 py-3 text-center mb-3">
              <p className="text-xs text-slate-400 mb-1">Code</p>
              <p className="text-2xl font-bold tracking-widest">{session.code}</p>
            </div>
            <button
              onClick={copyUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 mb-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() => {
                const canvas = document.getElementById("qr-download") as HTMLCanvasElement;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `learnfast-${session.code}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
            >
              Download QR (PNG)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
