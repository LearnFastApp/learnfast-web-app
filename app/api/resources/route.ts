import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const QUERIES: Record<string, string> = {
  clarity:
    "how to improve presentation clarity communication skills speaker training",
  engagement:
    "audience engagement techniques presenting tips public speaking",
  energy:
    "presenter energy stage presence vocal delivery public speaking training",
  understanding:
    "how to explain complex ideas simply presenting teaching skills",
  connection:
    "building rapport audience connection authentic presenting public speaking",
};

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

// In-memory cache per dimension — persists for life of the container
const cache = new Map<string, { videos: VideoResult[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(req: NextRequest) {
  const dimension = req.nextUrl.searchParams.get("dimension");

  if (!dimension || !QUERIES[dimension]) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const cached = cache.get(dimension);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ videos: cached.videos });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  const query = encodeURIComponent(QUERIES[dimension]);
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${query}&type=video&videoDuration=medium` +
    `&maxResults=3&relevanceLanguage=en&key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
  }

  const json = await res.json();

  const videos: VideoResult[] = (json.items ?? []).map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        "",
    })
  );

  cache.set(dimension, { videos, ts: Date.now() });
  return NextResponse.json({ videos });
}
