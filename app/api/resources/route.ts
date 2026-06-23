import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { articlesByDimension } from "@/lib/articles";

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

interface CacheEntry {
  videos: VideoResult[];
  tedTalks: VideoResult[];
  articles: ArticleResult[];
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

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

function buildYouTubeUrl(query: string, maxResults: number, apiKey: string) {
  return (
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium` +
    `&maxResults=${maxResults}&relevanceLanguage=en&key=${apiKey}`
  );
}

async function getHealthyArticles(dimension: string): Promise<ArticleResult[]> {
  const all = articlesByDimension(dimension);
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("resource_health")
      .where("dimension", "==", dimension)
      .where("status", "==", "broken")
      .get();
    const brokenUrls = new Set(snap.docs.map((d) => d.data().url as string));
    return all.filter((a) => !brokenUrls.has(a.url));
  } catch {
    // If health check unavailable, serve all articles rather than none
    return all;
  }
}

export async function GET(req: NextRequest) {
  const dimension = req.nextUrl.searchParams.get("dimension");

  if (!dimension || !VIDEO_QUERIES[dimension]) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const cached = cache.get(dimension);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      videos: cached.videos,
      tedTalks: cached.tedTalks,
      articles: cached.articles,
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  const [videoRes, tedRes, articles] = await Promise.all([
    fetch(buildYouTubeUrl(VIDEO_QUERIES[dimension], 3, apiKey)),
    fetch(buildYouTubeUrl(TED_QUERIES[dimension], 3, apiKey)),
    getHealthyArticles(dimension),
  ]);

  if (!videoRes.ok || !tedRes.ok) {
    return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
  }

  const [videoJson, tedJson] = await Promise.all([videoRes.json(), tedRes.json()]);

  const videos = parseVideos(videoJson);
  const tedTalks = parseVideos(tedJson);

  cache.set(dimension, { videos, tedTalks, articles, ts: Date.now() });

  return NextResponse.json({ videos, tedTalks, articles });
}
