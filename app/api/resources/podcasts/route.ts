import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const QUERIES: Record<string, string> = {
  clarity: "presentation clarity communication public speaking",
  engagement: "public speaking audience engagement presenting",
  energy: "speaker confidence presence energy delivery",
  understanding: "teaching explaining ideas clearly simply",
  connection: "communication connection rapport storytelling",
};

interface PodcastResult {
  title: string;
  author: string;
  description: string;
  image: string;
  link: string;
}

const cache = new Map<string, { podcasts: PodcastResult[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

export async function GET(req: NextRequest) {
  const dimension = req.nextUrl.searchParams.get("dimension");

  if (!dimension || !QUERIES[dimension]) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const cached = cache.get(dimension);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ podcasts: cached.podcasts });
  }

  const apiKey = process.env.PODCAST_INDEX_KEY;
  const apiSecret = process.env.PODCAST_INDEX_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Podcast Index not configured" }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hash = createHash("sha1")
    .update(apiKey + apiSecret + timestamp)
    .digest("hex");

  const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(QUERIES[dimension])}&max=4&clean`;

  const res = await fetch(url, {
    headers: {
      "X-Auth-Key": apiKey,
      "X-Auth-Date": timestamp,
      "Authorization": hash,
      "User-Agent": "LearnFastApp/1.0",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Podcast Index API error" }, { status: 502 });
  }

  const json = await res.json();

  const podcasts: PodcastResult[] = (json.feeds ?? [])
    .slice(0, 4)
    .map((feed: {
      title: string;
      author: string;
      description: string;
      image: string;
      link: string;
      itunesId: number | null;
    }) => ({
      title: feed.title,
      author: feed.author || "Unknown host",
      description: feed.description
        ? feed.description.replace(/<[^>]*>/g, "").slice(0, 100) + "…"
        : "",
      image: feed.image,
      link: feed.itunesId
        ? `https://podcasts.apple.com/podcast/id${feed.itunesId}`
        : feed.link,
    }));

  cache.set(dimension, { podcasts, ts: Date.now() });
  return NextResponse.json({ podcasts });
}
