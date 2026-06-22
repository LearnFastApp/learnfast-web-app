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
} from "recharts";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Copy, Check, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface FeedbackResponse {
  clarity: number;
  engagement: number;
  energy: number;
  understanding: number;
  connection: number;
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    getDoc(doc(db, "sessions", id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession({ title: data.title, code: data.code });
      }
    });

    const q = query(collection(db, "feedback_responses"), where("sessionId", "==", id));
    return onSnapshot(q, (snap) => {
      setResponses(snap.docs.map((d) => d.data() as FeedbackResponse));
    });
  }, [id, user, authLoading, router]);

  const averages = DIMENSIONS.reduce(
    (acc, dim) => ({
      ...acc,
      [dim]: average(responses.map((r) => r[dim])),
    }),
    {} as Record<Dimension, number>
  );

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    value: averages[dim],
    fullMark: 100,
  }));

  const feedbackUrl = session
    ? `${window.location.origin}/session/${session.code}`
    : "";

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
      <header className="border-b border-white/10 bg-[#101523] px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white"
        >
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
        <div className="flex items-center gap-2 text-slate-400">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold text-white">{responses.length}</span>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-4 text-lg font-bold">Live averages</h2>
            {responses.length === 0 ? (
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
                    <Radar
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-5 gap-3">
                  {DIMENSIONS.map((dim) => (
                    <div key={dim} className="text-center">
                      <p className="text-xs text-slate-400 capitalize">{dim}</p>
                      <p className="text-xl font-bold text-white">{averages[dim]}</p>
                      <p className="text-xs text-slate-500">/100</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Share with audience
            </h2>
            <div className="flex justify-center rounded-xl bg-white p-4 mb-4">
              <QRCodeSVG value={feedbackUrl} size={160} />
            </div>
            <div className="rounded-xl bg-[#1a2135] px-4 py-3 text-center mb-3">
              <p className="text-xs text-slate-400 mb-1">Code</p>
              <p className="text-2xl font-bold tracking-widest">{session.code}</p>
            </div>
            <button
              onClick={copyUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
