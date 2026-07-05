import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSeenResources, recordSeenResources, filterUnseen } from "@/lib/resource-history";

export const dynamic = "force-dynamic";

const QUERIES: Record<string, string> = {
  clarity: "presentation skills communication",
  engagement: "public speaking audience engagement",
  energy: "speaker confidence stage presence delivery",
  understanding: "communication skills teaching explanation",
  connection: "storytelling empathy rapport leadership",
};

interface PodcastResult {
  title: string;
  author: string;
  description: string;
  image: string;
  link: string;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

async function getCachedPodcasts(dimension: string): Promise<PodcastResult[] | null> {
  const db = getAdminDb();
  const doc = await db.collection("resource_cache").doc(`podcasts_${dimension}`).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  const updatedAt: number = data.updatedAt?.toMillis?.() ?? 0;
  if (Date.now() - updatedAt > CACHE_TTL_MS) return null;
  const podcasts = data.podcasts as PodcastResult[];
  if (!podcasts?.length) return null; // treat empty cache as a miss so fallback runs
  return podcasts;
}

async function setCachedPodcasts(dimension: string, podcasts: PodcastResult[]) {
  const db = getAdminDb();
  await db.collection("resource_cache").doc(`podcasts_${dimension}`).set({
    podcasts,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function fetchFromPodcastIndex(dimension: string): Promise<PodcastResult[]> {
  const apiKey = process.env.PODCAST_INDEX_KEY;
  const apiSecret = process.env.PODCAST_INDEX_SECRET;
  if (!apiKey || !apiSecret) return [];

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hash = createHash("sha1")
    .update(apiKey + apiSecret + timestamp)
    .digest("hex");

  const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(QUERIES[dimension])}&max=8&clean`;

  const res = await fetch(url, {
    headers: {
      "X-Auth-Key": apiKey,
      "X-Auth-Date": timestamp,
      Authorization: hash,
      "User-Agent": "LearnFastApp/1.0",
    },
  });

  if (!res.ok) return [];

  const json = await res.json();
  return (json.feeds ?? [])
    .slice(0, 8)
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
}

async function fetchFromItunes(dimension: string): Promise<PodcastResult[]> {
  const query = QUERIES[dimension];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=10&country=US`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "LearnFastApp/1.0" } });
    if (!res.ok) return [];
    const json = await res.json() as {
      results?: { collectionName: string; artistName: string; artworkUrl100: string; trackViewUrl: string }[];
    };
    return (json.results ?? []).slice(0, 8).map((item) => ({
      title: item.collectionName,
      author: item.artistName || "Unknown host",
      description: "",
      image: item.artworkUrl100 ?? "",
      link: item.trackViewUrl,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(`podcasts:${getIp(req)}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const dimension = req.nextUrl.searchParams.get("dimension");
  if (!dimension || !QUERIES[dimension]) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const uid = await verifyAuthToken(req);

  // Fetch full pool from Firestore cache, then Podcast Index, then iTunes as fallback
  let pool = await getCachedPodcasts(dimension);
  if (!pool) {
    pool = await fetchFromPodcastIndex(dimension);
    if (pool.length === 0) {
      pool = await fetchFromItunes(dimension);
    }
    if (pool.length > 0) {
      await setCachedPodcasts(dimension, pool);
    }
  }

  if (!uid || pool.length === 0) {
    return NextResponse.json({ podcasts: pool.slice(0, 4) });
  }

  // Filter seen podcasts for this user
  const seen = await getSeenResources(uid, dimension);
  const { items: podcasts, didReset } = filterUnseen(pool, (p) => p.link, seen.podcasts);

  // Show up to 4
  const toServe = podcasts.slice(0, 4);

  recordSeenResources(
    uid,
    dimension,
    { articles: [], videos: [], ted: [], podcasts: toServe.map((p) => p.link) },
    { articles: false, videos: false, ted: false, podcasts: didReset }
  ).catch((err) => console.error("[resource-history/podcasts]", err));

  return NextResponse.json({ podcasts: toServe });
}
