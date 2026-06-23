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
      title: "How to Structure a Presentation That's Easy to Follow",
      url: "https://visme.co/blog/presentation-tips/",
      source: "Visme",
    },
    {
      title: "The Feynman Technique: Explain Anything Simply",
      url: "https://fs.blog/feynman-technique/",
      source: "Farnam Street",
    },
    {
      title: "Communication Skills: What They Are and How to Improve",
      url: "https://www.coursera.org/articles/communication-skills",
      source: "Coursera",
    },
    {
      title: "How to End a Presentation With Impact",
      url: "https://visme.co/blog/how-to-end-a-presentation/",
      source: "Visme",
    },
    {
      title: "Presentation Tips for Clearer Communication",
      url: "https://www.skillsyouneed.com/present/presentation-tips.html",
      source: "Skills You Need",
    },
  ],
  engagement: [
    {
      title: "Active Listening: The Art of Empathetic Conversation",
      url: "https://positivepsychology.com/active-listening/",
      source: "Positive Psychology",
    },
    {
      title: "Communication Skills: The Art of Connecting",
      url: "https://positivepsychology.com/communication-skills/",
      source: "Positive Psychology",
    },
    {
      title: "Public Speaking: How to Inform and Inspire",
      url: "https://www.coursera.org/articles/public-speaking",
      source: "Coursera",
    },
    {
      title: "How to Give Engaging Presentations",
      url: "https://www.entrepreneur.com/leadership/how-to-give-engaging-presentations/299983",
      source: "Entrepreneur",
    },
    {
      title: "20 Public Speaking Tips With Great Examples",
      url: "https://visme.co/blog/public-speaking-tips/",
      source: "Visme",
    },
  ],
  energy: [
    {
      title: "Vocal Power: How to Command a Room With Your Voice",
      url: "https://www.entrepreneur.com/leadership/vocal-power-how-to-command-a-room-with-your-voice/299987",
      source: "Entrepreneur",
    },
    {
      title: "Body Language Tips for Speakers",
      url: "https://www.entrepreneur.com/leadership/body-language-tips-for-speakers/299986",
      source: "Entrepreneur",
    },
    {
      title: "What Is Self-Confidence? 9 Proven Ways to Increase It",
      url: "https://positivepsychology.com/self-confidence/",
      source: "Positive Psychology",
    },
    {
      title: "Nonverbal Communication Skills: What the Research Says",
      url: "https://positivepsychology.com/nonverbal-communication/",
      source: "Positive Psychology",
    },
    {
      title: "10 Tips for Effective Public Speaking",
      url: "https://www.entrepreneur.com/leadership/10-tips-for-effective-public-speaking/227713",
      source: "Entrepreneur",
    },
  ],
  understanding: [
    {
      title: "The Feynman Technique: Make Complex Ideas Stick",
      url: "https://fs.blog/feynman-technique/",
      source: "Farnam Street",
    },
    {
      title: "Active Listening Techniques: How to Really Hear Your Audience",
      url: "https://positivepsychology.com/active-listening-techniques/",
      source: "Positive Psychology",
    },
    {
      title: "7 Tips for Improving Public Speaking Skills",
      url: "https://www.entrepreneur.com/leadership/7-tips-for-improving-public-speaking-skills/299980",
      source: "Entrepreneur",
    },
    {
      title: "Active Listening: Hear What People Are Really Saying",
      url: "https://www.mindtools.com/pages/article/ActiveListening.htm",
      source: "MindTools",
    },
    {
      title: "5 Surprising Charisma Tips That Actually Work",
      url: "https://www.entrepreneur.com/living/5-surprising-charisma-tips/234375",
      source: "Entrepreneur",
    },
  ],
  connection: [
    {
      title: "Building Rapport: Creating Strong Relationships",
      url: "https://www.mindtools.com/pages/article/building-rapport.htm",
      source: "MindTools",
    },
    {
      title: "How to Build Rapport: 18 Examples and Techniques",
      url: "https://positivepsychology.com/rapport/",
      source: "Positive Psychology",
    },
    {
      title: "Empathy in Communication: How to Connect Authentically",
      url: "https://positivepsychology.com/empathy/",
      source: "Positive Psychology",
    },
    {
      title: "The Secret of Charismatic People",
      url: "https://www.entrepreneur.com/living/the-secret-of-charismatic-people/234374",
      source: "Entrepreneur",
    },
    {
      title: "Building Rapport With Your Audience",
      url: "https://www.skillsyouneed.com/ips/rapport.html",
      source: "Skills You Need",
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
