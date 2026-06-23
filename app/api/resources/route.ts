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
      title: "Presentation Skills: How to Structure and Deliver with Clarity",
      url: "https://www.mindtools.com/pages/article/PresentationSkills.htm",
      source: "MindTools",
    },
    {
      title: "The Feynman Technique: Explain Anything Simply",
      url: "https://fs.blog/feynman-technique/",
      source: "Farnam Street",
    },
    {
      title: "Communication Skills: Building Better Conversations",
      url: "https://www.mindtools.com/az4wxv7/communication-skills",
      source: "MindTools",
    },
    {
      title: "Presentation Preparation: How to Plan Your Talk",
      url: "https://www.mindtools.com/pages/article/presentation-preparation.htm",
      source: "MindTools",
    },
    {
      title: "Communication Skills: What They Are and How to Improve",
      url: "https://www.coursera.org/articles/communication-skills",
      source: "Coursera",
    },
  ],
  engagement: [
    {
      title: "Audience Analysis: Understanding Who You're Talking To",
      url: "https://www.mindtools.com/az4wxv7/audience-analysis",
      source: "MindTools",
    },
    {
      title: "Storytelling: A Powerful Tool for Presenters and Leaders",
      url: "https://www.mindtools.com/pages/article/storytelling.htm",
      source: "MindTools",
    },
    {
      title: "How to Give Engaging Presentations",
      url: "https://www.entrepreneur.com/leadership/how-to-give-engaging-presentations/299983",
      source: "Entrepreneur",
    },
    {
      title: "Active Listening: Hear What People Are Really Saying",
      url: "https://www.mindtools.com/pages/article/ActiveListening.htm",
      source: "MindTools",
    },
    {
      title: "Communication Skills: The Art of Connecting",
      url: "https://positivepsychology.com/communication-skills/",
      source: "Positive Psychology",
    },
  ],
  energy: [
    {
      title: "Using Your Vocal Tone to Command Attention",
      url: "https://www.mindtools.com/pages/article/vocal-tone.htm",
      source: "MindTools",
    },
    {
      title: "Body Language: Communicate More Effectively",
      url: "https://www.mindtools.com/pages/article/body-language.htm",
      source: "MindTools",
    },
    {
      title: "Overcoming Nervousness: Staying Calm Under Pressure",
      url: "https://www.mindtools.com/pages/article/nervousness.htm",
      source: "MindTools",
    },
    {
      title: "Vocal Communication: Using Your Voice Powerfully",
      url: "https://www.mindtools.com/pages/article/vocal-communication.htm",
      source: "MindTools",
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
      title: "Public Speaking: How to Inform and Inspire",
      url: "https://www.coursera.org/articles/public-speaking",
      source: "Coursera",
    },
    {
      title: "Presentation Tips for Clearer, More Effective Talks",
      url: "https://www.skillsyouneed.com/present/presentation-tips.html",
      source: "Skills You Need",
    },
    {
      title: "Active Listening: The Key to Understanding Your Audience",
      url: "https://positivepsychology.com/active-listening-techniques/",
      source: "Positive Psychology",
    },
    {
      title: "7 Tips for Improving Public Speaking Skills",
      url: "https://www.entrepreneur.com/leadership/7-tips-for-improving-public-speaking-skills/299980",
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
      title: "Empathy: A Key Skill for Connecting With Others",
      url: "https://www.mindtools.com/pages/article/empathy.htm",
      source: "MindTools",
    },
    {
      title: "Building Rapport With Your Audience",
      url: "https://www.skillsyouneed.com/ips/rapport.html",
      source: "Skills You Need",
    },
    {
      title: "The Secret of Charismatic People",
      url: "https://www.entrepreneur.com/living/the-secret-of-charismatic-people/234374",
      source: "Entrepreneur",
    },
    {
      title: "Storytelling: Connect Through Narrative",
      url: "https://www.mindtools.com/pages/article/storytelling.htm",
      source: "MindTools",
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
