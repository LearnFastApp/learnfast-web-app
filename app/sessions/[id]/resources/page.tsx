"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import Image from "next/image";
import { ExternalLink, Play, Mic, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIMENSION_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  engagement: "Engagement",
  energy: "Energy",
  understanding: "Understanding",
  connection: "Connection",
};

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#8b5cf6",
  engagement: "#22d3ee",
  energy: "#f59e0b",
  understanding: "#34d399",
  connection: "#f472b6",
};

const DESCRIPTIONS: Record<Dimension, string> = {
  clarity: "Your audience found it harder to follow your message. These resources will help you structure ideas and communicate with precision.",
  engagement: "Your audience felt less captivated during this session. Explore these resources on audience engagement techniques.",
  energy: "Your energy levels could have been higher. These resources cover presence, vocal variety, and delivery techniques.",
  understanding: "Some of your message didn't land as clearly as intended. These resources focus on explanation and knowledge transfer.",
  connection: "Building rapport with your audience is key. These resources will help you create stronger human connection when presenting.",
};

interface Video { videoId: string; title: string; channelTitle: string; thumbnail: string; }
interface Article { title: string; url: string; source: string; }
interface Podcast { title: string; author: string; description: string; image: string; link: string; }
interface DimResources { videos: Video[]; tedTalks: Video[]; articles: Article[]; podcasts: Podcast[]; }

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function getLowest(averages: Record<Dimension, number>): Dimension | null {
  const dims = Object.entries(averages) as [Dimension, number][];
  if (dims.every(([, v]) => v === 0)) return null;
  return dims.reduce((a, b) => b[1] < a[1] ? b : a)[0];
}

function getSecondLowest(averages: Record<Dimension, number>): Dimension | null {
  const dims = (Object.entries(averages) as [Dimension, number][]).filter(([, v]) => v > 0);
  if (dims.length < 2) return null;
  return [...dims].sort((a, b) => a[1] - b[1])[1][0];
}

function VideoCard({ video, type }: { video: Video; type: "youtube" | "ted" }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition group"
    >
      <div className="relative shrink-0 w-24 h-[54px] rounded-lg overflow-hidden bg-black">
        <Image src={video.thumbnail} alt={video.title} fill className="object-cover" sizes="96px" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
          <Play className="h-5 w-5 text-white fill-white" />
        </div>
        {type === "ted" && (
          <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 text-[9px] font-bold text-white">TED</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">{video.title}</p>
        <p className="mt-1 text-[11px] text-slate-500">{video.channelTitle}</p>
      </div>
    </a>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition group"
    >
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 group-hover:text-white transition" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white leading-snug">{article.title}</p>
        <p className="mt-1 text-[11px] text-slate-500">{article.source}</p>
      </div>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 group-hover:text-slate-400 transition" />
    </a>
  );
}

function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <a
      href={podcast.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition group"
    >
      {podcast.image ? (
        <div className="relative shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-slate-800">
          <Image src={podcast.image} alt={podcast.title} fill className="object-cover" sizes="40px" />
        </div>
      ) : (
        <div className="shrink-0 h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
          <Mic className="h-4 w-4 text-slate-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white leading-snug line-clamp-1">{podcast.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{podcast.author}</p>
        {podcast.description && (
          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{podcast.description}</p>
        )}
      </div>
    </a>
  );
}

function ResourceSection({
  dimension,
  score,
  resources,
  loading,
  label,
}: {
  dimension: Dimension;
  score: number;
  resources: DimResources | null;
  loading: boolean;
  label: "Recommended focus" | "Also worth working on";
}) {
  const color = DIM_COLORS[dimension];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color }}>
          {label}
        </p>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{DIMENSION_LABELS[dimension]}</h2>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: `${color}22`, color }}>
            {score}/100
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-400">{DESCRIPTIONS[dimension]}</p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 animate-pulse h-20" />
            ))}
          </div>
        ) : resources ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {/* YouTube Videos */}
            {resources.videos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Play className="h-4 w-4 text-red-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Videos</h3>
                </div>
                <div className="space-y-2">
                  {resources.videos.slice(0, 3).map((v) => (
                    <VideoCard key={v.videoId} video={v} type="youtube" />
                  ))}
                </div>
              </div>
            )}

            {/* TED Talks */}
            {resources.tedTalks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-600/10 rounded px-1.5 py-0.5">TED</span>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">TED Talks</h3>
                </div>
                <div className="space-y-2">
                  {resources.tedTalks.slice(0, 3).map((v) => (
                    <VideoCard key={v.videoId} video={v} type="ted" />
                  ))}
                </div>
              </div>
            )}

            {/* Articles */}
            {resources.articles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-violet-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Articles</h3>
                </div>
                <div className="space-y-2">
                  {resources.articles.slice(0, 4).map((a) => (
                    <ArticleCard key={a.url} article={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Podcasts */}
            {resources.podcasts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="h-4 w-4 text-green-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Podcasts</h3>
                </div>
                <div className="space-y-2">
                  {resources.podcasts.slice(0, 3).map((p) => (
                    <PodcastCard key={p.link} podcast={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Resources unavailable right now.</p>
        )}
      </div>
    </section>
  );
}

export default function ResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [sessionTitle, setSessionTitle] = useState("");
  const [audienceAverages, setAudienceAverages] = useState<Record<Dimension, number> | null>(null);
  const [primaryResources, setPrimaryResources] = useState<DimResources | null>(null);
  const [secondaryResources, setSecondaryResources] = useState<DimResources | null>(null);
  const [primaryLoading, setPrimaryLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  // Load session + responses
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }

    async function load() {
      const sessionSnap = await getDoc(doc(db, "sessions", id));
      if (!sessionSnap.exists() || sessionSnap.data().presenterId !== user!.uid) {
        router.replace("/dashboard");
        return;
      }
      setSessionTitle(sessionSnap.data().title ?? "Untitled session");

      const respSnap = await getDocs(
        query(collection(db, "feedback_responses"), where("sessionId", "==", id))
      );
      const responses = respSnap.docs.map((d) => d.data());
      const avgs = DIMENSIONS.reduce((acc, dim) => {
        acc[dim] = average(responses.map((r) => r[dim] ?? 0));
        return acc;
      }, {} as Record<Dimension, number>);
      setAudienceAverages(avgs);
      setPageLoading(false);
    }

    load().catch(() => setPageLoading(false));
  }, [id, user, authLoading, router]);

  // Fetch resources once averages are known
  useEffect(() => {
    if (!audienceAverages || !user) return;

    const primary = getLowest(audienceAverages);
    const secondary = getSecondLowest(audienceAverages);
    if (!primary) return;

    user.getIdToken().then((token) => {
      const headers = { Authorization: `Bearer ${token}` };

      // Primary dimension: videos + articles + podcasts
      Promise.all([
        fetch(`/api/resources?dimension=${primary}`, { headers }).then((r) => r.json()),
        fetch(`/api/resources/podcasts?dimension=${primary}`, { headers }).then((r) => r.json()),
      ]).then(([res, pod]) => {
        setPrimaryResources({ videos: res.videos ?? [], tedTalks: res.tedTalks ?? [], articles: res.articles ?? [], podcasts: pod.podcasts ?? [] });
        setPrimaryLoading(false);
      }).catch(() => setPrimaryLoading(false));

      // Secondary dimension
      if (!secondary) { setSecondaryLoading(false); return; }
      Promise.all([
        fetch(`/api/resources?dimension=${secondary}`, { headers }).then((r) => r.json()),
        fetch(`/api/resources/podcasts?dimension=${secondary}`, { headers }).then((r) => r.json()),
      ]).then(([res, pod]) => {
        setSecondaryResources({ videos: res.videos ?? [], tedTalks: res.tedTalks ?? [], articles: res.articles ?? [], podcasts: pod.podcasts ?? [] });
        setSecondaryLoading(false);
      }).catch(() => setSecondaryLoading(false));
    });
  }, [audienceAverages, user]);

  if (pageLoading || authLoading) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading resources…</p>
      </main>
    );
  }

  const primary = audienceAverages ? getLowest(audienceAverages) : null;
  const secondary = audienceAverages ? getSecondLowest(audienceAverages) : null;

  if (!primary || !audienceAverages) {
    return (
      <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No feedback data yet — resources will appear once your audience has responded.</p>
          <a href={`/sessions/${id}`} className="text-violet-400 hover:text-violet-300 text-sm">← Back to session</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070d]/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <a href={`/sessions/${id}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
            ← {sessionTitle || "Back to session"}
          </a>
          <h1 className="text-sm font-semibold text-white">Improvement Resources</h1>
          <div className="w-32" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Your resources</h2>
          <p className="mt-1 text-sm text-slate-400">
            Curated based on your audience feedback · personalised to what you haven&apos;t seen yet.
          </p>
        </div>

        <ResourceSection
          dimension={primary}
          score={audienceAverages[primary]}
          resources={primaryResources}
          loading={primaryLoading}
          label="Recommended focus"
        />

        {secondary && (
          <ResourceSection
            dimension={secondary}
            score={audienceAverages[secondary]}
            resources={secondaryResources}
            loading={secondaryLoading}
            label="Also worth working on"
          />
        )}
      </div>
    </main>
  );
}
