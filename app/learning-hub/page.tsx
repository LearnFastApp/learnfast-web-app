"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Film, Mic, ExternalLink, Loader2, ChevronRight, Radio,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import MobileNav from "@/components/mobile-nav";
import { useLocale } from "@/lib/i18n";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection";

const DIMENSIONS: { key: Dimension; label: string; labelFr: string; dot: string; active: string }[] = [
  { key: "clarity",       label: "Clarity",       labelFr: "Clarté",        dot: "bg-violet-400",  active: "bg-violet-600 border-violet-500 text-white" },
  { key: "energy",        label: "Energy",         labelFr: "Énergie",       dot: "bg-amber-400",   active: "bg-amber-600 border-amber-500 text-white" },
  { key: "engagement",    label: "Engagement",     labelFr: "Engagement",    dot: "bg-cyan-400",    active: "bg-cyan-600 border-cyan-500 text-white" },
  { key: "understanding", label: "Understanding",  labelFr: "Compréhension", dot: "bg-emerald-400", active: "bg-emerald-600 border-emerald-500 text-white" },
  { key: "connection",    label: "Connection",     labelFr: "Connexion",     dot: "bg-pink-400",    active: "bg-pink-600 border-pink-500 text-white" },
];

interface Article { title: string; url: string; source: string }
interface Video   { videoId: string; title: string; channelTitle: string; thumbnail: string }
interface Podcast { title: string; url: string; podcastTitle: string; duration?: number }
interface Webinar { id: string; title: string; date: string; url: string; organiser?: string }

interface ResourcePayload {
  articles: Article[];
  videos: Video[];
  tedTalks: Video[];
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min` : `${s}s`;
}

export default function LearningHubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const isFr = locale === "fr";

  const [activeDim, setActiveDim] = useState<Dimension>("clarity");
  const [resources, setResources]   = useState<ResourcePayload | null>(null);
  const [podcasts, setPodcasts]     = useState<Podcast[]>([]);
  const [webinars, setWebinars]     = useState<Webinar[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [loadingPod, setLoadingPod] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async (dim: Dimension) => {
    if (!user) return;
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };

    setLoadingRes(true);
    setLoadingPod(true);
    setLoadingWeb(true);
    setResources(null);
    setPodcasts([]);
    setWebinars([]);

    fetch(`/api/resources?dimension=${dim}&locale=${locale}`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setResources(d); })
      .finally(() => setLoadingRes(false));

    fetch(`/api/resources/podcasts?dimension=${dim}`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.episodes) setPodcasts(d.episodes); })
      .finally(() => setLoadingPod(false));

    fetch(`/api/webinars?dimension=${dim}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.webinars) setWebinars(d.webinars); })
      .finally(() => setLoadingWeb(false));
  }, [user, locale]);

  useEffect(() => {
    if (user) fetchAll(activeDim);
  }, [activeDim, user, fetchAll]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  const allVideos = [...(resources?.videos ?? []), ...(resources?.tedTalks ?? [])];

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <MobileNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pt-20 md:pt-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold">
              {isFr ? "Contenu éducatif" : "Educational Content"}
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            {isFr
              ? "Articles, vidéos et podcasts pour développer chaque dimension de votre prise de parole."
              : "Articles, videos and podcasts to develop each dimension of your presenting."}
          </p>
        </div>

        {/* Dimension tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDim(d.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                activeDim === d.key
                  ? d.active
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${d.dot}`} />
              {isFr ? d.labelFr : d.label}
            </button>
          ))}
        </div>

        {/* Articles */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {isFr ? "Articles" : "Articles"}
            </h2>
          </div>
          {loadingRes ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> {isFr ? "Chargement…" : "Loading…"}
            </div>
          ) : resources?.articles?.length ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {resources.articles.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0f172a] p-5 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                >
                  <p className="text-sm font-medium text-white leading-snug mb-3 group-hover:text-violet-200 transition-colors line-clamp-3">
                    {a.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{a.source}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            !loadingRes && <p className="text-sm text-slate-500 py-2">{isFr ? "Aucun article disponible." : "No articles available."}</p>
          )}
        </section>

        {/* Videos */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {isFr ? "Vidéos" : "Videos"}
            </h2>
          </div>
          {loadingRes ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : allVideos.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allVideos.map((v, i) => (
                <a
                  key={i}
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-white/10 bg-[#0f172a] overflow-hidden hover:border-white/20 transition-all"
                >
                  {v.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-xs font-medium text-white leading-snug line-clamp-2 group-hover:text-violet-200 transition-colors">
                      {v.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{v.channelTitle}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">{isFr ? "Aucune vidéo disponible." : "No videos available."}</p>
          )}
        </section>

        {/* Podcasts */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {isFr ? "Podcasts" : "Podcasts"}
            </h2>
          </div>
          {loadingPod ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : podcasts.length ? (
            <div className="flex flex-col gap-2">
              {podcasts.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f172a] px-5 py-4 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-violet-200 transition-colors">
                      {p.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.podcastTitle}{p.duration ? ` · ${formatDuration(p.duration)}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 ml-4 transition-colors" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">{isFr ? "Aucun podcast disponible." : "No podcasts available."}</p>
          )}
        </section>

        {/* Webinars */}
        {(loadingWeb || webinars.length > 0) && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {isFr ? "Webinaires à venir" : "Upcoming Webinars"}
              </h2>
            </div>
            {loadingWeb ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {webinars.map((w) => (
                  <a
                    key={w.id}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f172a] px-5 py-4 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-violet-200 transition-colors">
                        {w.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {w.organiser && `${w.organiser} · `}
                        {new Date(w.date).toLocaleDateString(isFr ? "fr-FR" : "en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 ml-4 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
