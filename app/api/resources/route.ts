import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { articlesByDimension, applyOverrides, ArticleOverride } from "@/lib/articles";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { getSeenResources, recordSeenResources, filterUnseen } from "@/lib/resource-history";

export const dynamic = "force-dynamic";

const VIDEO_QUERIES: Record<string, string> = {
  clarity: "how to improve presentation clarity communication skills speaker training",
  engagement: "audience engagement techniques presenting tips public speaking",
  energy: "presenter energy stage presence vocal delivery public speaking training",
  understanding: "how to explain complex ideas simply presenting teaching skills",
  connection: "building rapport audience connection authentic presenting public speaking",
};

const TED_QUERIES: Record<string, string> = {
  clarity: "TEDx clear communication presentation speaking",
  engagement: "TEDx audience engagement public speaking presentation",
  energy: "TEDx speaker presence energy confidence stage",
  understanding: "TEDx explain complex ideas teaching simple",
  connection: "TEDx connection audience rapport storytelling speaking",
};

const VIDEO_QUERIES_FR: Record<string, string> = {
  clarity: "améliorer clarté présentation communication orale formation",
  engagement: "engager audience techniques présentation prise de parole",
  energy: "énergie présence scénique voix confiance prise de parole",
  understanding: "expliquer idées complexes simplement pédagogie communication",
  connection: "connexion audience authenticité storytelling prise de parole",
};

const TED_QUERIES_FR: Record<string, string> = {
  clarity: "TEDx communication claire présentation française",
  engagement: "TEDx engagement public parler en public français",
  energy: "TEDx confiance énergie présence scénique",
  understanding: "TEDx expliquer enseigner comprendre français",
  connection: "TEDx connexion authenticité storytelling français",
};

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

interface ArticleResult {
  title: string;
  url: string;
  source: string;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

async function getCachedResources(dimension: string) {
  const db = getAdminDb();
  const doc = await db.collection("resource_cache").doc(dimension).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  const updatedAt: number = data.updatedAt?.toMillis?.() ?? 0;
  if (Date.now() - updatedAt > CACHE_TTL_MS) return null;
  return {
    videos: data.videos as VideoResult[],
    tedTalks: data.tedTalks as VideoResult[],
    articles: data.articles as ArticleResult[],
  };
}

async function setCachedResources(
  dimension: string,
  payload: { videos: VideoResult[]; tedTalks: VideoResult[]; articles: ArticleResult[] }
) {
  const db = getAdminDb();
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("resource_cache").doc(dimension).set({
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function parseVideos(json: { items?: unknown[] }): VideoResult[] {
  return (json.items ?? []).map(
    (item: unknown) => {
      const i = item as {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
        };
      };
      return {
        videoId: i.id.videoId,
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails?.medium?.url ?? i.snippet.thumbnails?.default?.url ?? "",
      };
    }
  );
}

function buildYouTubeUrl(query: string, maxResults: number, apiKey: string, lang = "en") {
  return (
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium` +
    `&maxResults=${maxResults}&relevanceLanguage=${lang}&key=${apiKey}`
  );
}

async function getHealthyArticles(dimension: string, locale: string): Promise<ArticleResult[]> {
  const all = articlesByDimension(dimension, locale);
  try {
    const db = getAdminDb();
    const [brokenSnap, overrideSnap] = await Promise.all([
      db.collection("resource_health").where("dimension", "==", dimension).where("status", "==", "broken").get(),
      db.collection("article_overrides").where("dimension", "==", dimension).where("locale", "==", locale).get(),
    ]);
    const brokenUrls = new Set(brokenSnap.docs.map((d) => d.data().url as string));
    const overrides: ArticleOverride[] = overrideSnap.docs.map((d) => ({
      originalUrl: d.data().originalUrl as string,
      replacementUrl: d.data().replacementUrl as string,
      replacementTitle: d.data().replacementTitle as string,
      replacementSource: d.data().replacementSource as string,
      dimension: d.data().dimension as string,
    }));
    // Apply overrides (replaces broken URLs with working ones), then filter any still-broken
    const patched = applyOverrides(all, overrides);
    return patched.filter((a) => !brokenUrls.has(a.url));
  } catch {
    return all;
  }
}

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(`resources:${getIp(req)}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const dimension = req.nextUrl.searchParams.get("dimension");
  if (!dimension || !VIDEO_QUERIES[dimension]) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const locale = req.nextUrl.searchParams.get("locale") === "fr" ? "fr" : "en";
  const cacheKey = locale === "fr" ? `${dimension}-fr` : dimension;
  const videoQueries = locale === "fr" ? VIDEO_QUERIES_FR : VIDEO_QUERIES;
  const tedQueries = locale === "fr" ? TED_QUERIES_FR : TED_QUERIES;

  // Optional auth — personalise if authenticated, serve full pool if not
  const uid = await verifyAuthToken(req);

  // Fetch full pool (from Firestore cache or YouTube API)
  let pool = await getCachedResources(cacheKey);
  if (!pool) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API not configured" }, { status: 500 });
    }
    const [videoRes, tedRes, articles] = await Promise.all([
      fetch(buildYouTubeUrl(videoQueries[dimension], 6, apiKey, locale)),
      fetch(buildYouTubeUrl(tedQueries[dimension], 6, apiKey, locale)),
      getHealthyArticles(dimension, locale),
    ]);
    if (!videoRes.ok || !tedRes.ok) {
      return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
    }
    const [videoJson, tedJson] = await Promise.all([videoRes.json(), tedRes.json()]);
    pool = { videos: parseVideos(videoJson), tedTalks: parseVideos(tedJson), articles };
    await setCachedResources(cacheKey, pool);
  }

  if (!uid) {
    // Unauthenticated — serve full pool, no history tracking
    return NextResponse.json(pool);
  }

  // Filter seen resources for this user
  const seen = await getSeenResources(uid, dimension);

  const { items: videos, didReset: videosReset } = filterUnseen(
    pool.videos, (v) => v.videoId, seen.videos
  );
  const { items: tedTalks, didReset: tedReset } = filterUnseen(
    pool.tedTalks, (v) => v.videoId, seen.ted
  );
  const { items: articles, didReset: articlesReset } = filterUnseen(
    pool.articles, (a) => a.url, seen.articles
  );

  const response = { videos, tedTalks, articles };

  // Record served resources in the background — don't block the response
  recordSeenResources(
    uid,
    dimension,
    {
      articles: articles.map((a) => a.url),
      videos: videos.map((v) => v.videoId),
      ted: tedTalks.map((v) => v.videoId),
      podcasts: [],
    },
    { articles: articlesReset, videos: videosReset, ted: tedReset, podcasts: false }
  ).catch((err) => console.error("[resource-history]", err));

  return NextResponse.json(response);
}
