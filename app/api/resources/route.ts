import { NextRequest, NextResponse } from "next/server";

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

const ARTICLES: Record<string, ArticleResult[]> = {
  clarity: [
    {
      title: "The Feynman Technique: How to Learn Anything",
      url: "https://fs.blog/feynman-technique/",
      source: "Farnam Street",
    },
    {
      title: "Public Speaking Tips — Clarity & Structure",
      url: "https://www.skillsyouneed.com/present/presentation-tips.html",
      source: "Skills You Need",
    },
    {
      title: "How to Speak So That People Want to Listen",
      url: "https://www.presentation-guru.com/how-to-speak-so-that-people-want-to-listen/",
      source: "Presentation Guru",
    },
    {
      title: "How to Outline a Speech or Presentation",
      url: "https://sixminutes.dlugan.com/speech-preparation-5-outlines/",
      source: "Six Minutes",
    },
    {
      title: "Ten Tips for Clear Communication",
      url: "https://mannerofspeaking.org/2010/05/22/ten-tips-for-clear-communication/",
      source: "Manner of Speaking",
    },
  ],
  engagement: [
    {
      title: "10 Ways to Immediately Engage Your Audience",
      url: "https://www.presentation-guru.com/10-ways-to-immediately-engage-your-audience/",
      source: "Presentation Guru",
    },
    {
      title: "How to Engage an Audience When Public Speaking",
      url: "https://www.skillsyouneed.com/present/engaging-an-audience.html",
      source: "Skills You Need",
    },
    {
      title: "Audience Engagement Tips from Toastmasters",
      url: "https://www.toastmasters.org/resources/public-speaking-tips",
      source: "Toastmasters International",
    },
    {
      title: "How to Open a Presentation and Hook Your Audience",
      url: "https://sixminutes.dlugan.com/speech-introduction/",
      source: "Six Minutes",
    },
    {
      title: "How to Get an Audience to Listen to Your Presentation",
      url: "https://blog.ted.com/how-to-get-your-audience-to-listen-and-engage-with-your-presentation/",
      source: "TED Blog",
    },
  ],
  energy: [
    {
      title: "Speech Delivery — Vocal Variety & Physical Presence",
      url: "https://www.skillsyouneed.com/present/speech-delivery.html",
      source: "Skills You Need",
    },
    {
      title: "How to Project Confidence When Presenting",
      url: "https://www.presentation-guru.com/how-to-project-confidence-when-presenting/",
      source: "Presentation Guru",
    },
    {
      title: "Vocal Variety: How to Add Energy to Your Voice",
      url: "https://sixminutes.dlugan.com/vocal-variety-speech/",
      source: "Six Minutes",
    },
    {
      title: "Using Body Language Effectively When Presenting",
      url: "https://mannerofspeaking.org/2011/04/04/body-language-for-speakers/",
      source: "Manner of Speaking",
    },
    {
      title: "Stage Presence and Commanding Attention",
      url: "https://www.toastmasters.org/resources/public-speaking-tips",
      source: "Toastmasters International",
    },
  ],
  understanding: [
    {
      title: "The Feynman Technique: Explain Anything Simply",
      url: "https://fs.blog/feynman-technique/",
      source: "Farnam Street",
    },
    {
      title: "How to Explain Complex Ideas Clearly",
      url: "https://www.skillsyouneed.com/present/presentation-tips.html",
      source: "Skills You Need",
    },
    {
      title: "Making Complex Information Simple",
      url: "https://www.presentation-guru.com/making-complex-information-simple/",
      source: "Presentation Guru",
    },
    {
      title: "Using Analogies to Explain Difficult Concepts",
      url: "https://sixminutes.dlugan.com/analogy/",
      source: "Six Minutes",
    },
    {
      title: "How to Make Your Ideas Clear to Your Audience",
      url: "https://mannerofspeaking.org/2013/09/08/how-to-be-a-clearer-speaker/",
      source: "Manner of Speaking",
    },
  ],
  connection: [
    {
      title: "9 Ways to Connect With Your Audience",
      url: "https://www.presentation-guru.com/9-ways-to-connect-with-your-audience/",
      source: "Presentation Guru",
    },
    {
      title: "Building Rapport With Your Audience",
      url: "https://www.skillsyouneed.com/ips/rapport.html",
      source: "Skills You Need",
    },
    {
      title: "Storytelling for Presentations — The Complete Guide",
      url: "https://sixminutes.dlugan.com/storytelling-for-presentations/",
      source: "Six Minutes",
    },
    {
      title: "How Great Speakers Connect With an Audience",
      url: "https://blog.ted.com/how-to-connect-with-your-audience/",
      source: "TED Blog",
    },
    {
      title: "The Power of Vulnerability in Public Speaking",
      url: "https://mannerofspeaking.org/2013/02/17/vulnerability-public-speaking/",
      source: "Manner of Speaking",
    },
  ],
};

interface CacheEntry {
  videos: VideoResult[];
  tedTalks: VideoResult[];
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
      articles: ARTICLES[dimension],
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  const [videoRes, tedRes] = await Promise.all([
    fetch(buildYouTubeUrl(VIDEO_QUERIES[dimension], 3, apiKey)),
    fetch(buildYouTubeUrl(TED_QUERIES[dimension], 3, apiKey)),
  ]);

  if (!videoRes.ok || !tedRes.ok) {
    return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
  }

  const [videoJson, tedJson] = await Promise.all([videoRes.json(), tedRes.json()]);

  const videos = parseVideos(videoJson);
  const tedTalks = parseVideos(tedJson);

  cache.set(dimension, { videos, tedTalks, ts: Date.now() });

  return NextResponse.json({ videos, tedTalks, articles: ARTICLES[dimension] });
}
