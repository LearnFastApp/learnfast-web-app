export const WEBINAR_QUERIES: Record<string, string> = {
  clarity: "presentation clarity communication speaking skills webinar",
  engagement: "audience engagement public speaking presentation webinar",
  energy: "speaker energy stage presence vocal confidence webinar",
  understanding: "teaching communication explain complex ideas webinar",
  connection: "audience connection rapport storytelling presenting webinar",
};

const DIMENSION_KEYWORDS: Record<string, string[]> = {
  clarity:     ["clarity", "clear", "structure", "message", "concise", "organised", "organized"],
  engagement:  ["engagement", "engage", "audience", "interactive", "participation", "attention", "hook"],
  energy:      ["energy", "presence", "vocal", "confidence", "body language", "stage", "delivery", "enthusiasm"],
  understanding: ["understanding", "explain", "teaching", "comprehension", "simplify", "complex", "learning"],
  connection:  ["connection", "rapport", "storytelling", "authentic", "empathy", "relate", "trust"],
};

export function tagDimensions(title: string, description: string): string[] {
  const text = (title + " " + description).toLowerCase();
  const matched = Object.entries(DIMENSION_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([dim]) => dim);
  return matched.length > 0 ? matched : ["engagement"];
}

export interface WebinarEntry {
  id: string;
  title: string;
  url: string;
  source: string;
  date: Date;
  dimensions: string[];
  description: string;
  isCurated: boolean;
}

interface EBEvent {
  id: string;
  name: { text: string };
  description?: { text?: string };
  url: string;
  start: { utc: string };
  is_free: boolean;
  online_event: boolean;
  status: string;
}

export async function fetchEventBriteWebinars(
  dimension: string,
  apiKey: string
): Promise<WebinarEntry[]> {
  const query = WEBINAR_QUERIES[dimension];
  if (!query) return [];

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    q: query,
    online_events_only: "true",
    status: "live",
    "start_date.range_start": now.toISOString(),
    "start_date.range_end": in30Days.toISOString(),
    page_size: "20",
  });

  try {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return [];

    const data = await res.json() as { events?: EBEvent[] };

    return (data.events ?? [])
      .filter((e) => e.is_free && e.online_event && e.status === "live")
      .map((e) => ({
        id: `eb_${e.id}`,
        title: e.name.text,
        url: e.url,
        source: "EventBrite",
        date: new Date(e.start.utc),
        dimensions: tagDimensions(e.name.text, e.description?.text ?? ""),
        description: (e.description?.text ?? "").replace(/\s+/g, " ").slice(0, 200),
        isCurated: false,
      }));
  } catch {
    return [];
  }
}

function getUpcomingFirstFridaysOfMonth(from: Date, count: number): Date[] {
  const results: Date[] = [];
  let year = from.getFullYear();
  let month = from.getMonth();

  while (results.length < count && year <= from.getFullYear() + 1) {
    const firstDay = new Date(year, month, 1);
    const daysUntilFriday = (5 - firstDay.getDay() + 7) % 7;
    const firstFriday = new Date(year, month, 1 + daysUntilFriday, 17, 0, 0, 0); // noon EST = 17:00 UTC
    if (firstFriday > from) results.push(firstFriday);
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return results;
}

export function getCuratedWebinars(): WebinarEntry[] {
  const now = new Date();
  const entries: WebinarEntry[] = [];

  // iSpeak — known 2026 schedule
  const ispeakEvents = [
    { title: "Presenting Ideas to Influence Decisions", date: new Date("2026-07-10T17:00:00Z") },
    { title: "Say More with Less",                      date: new Date("2026-08-11T16:00:00Z") },
  ];
  for (const e of ispeakEvents) {
    if (e.date > now) {
      entries.push({
        id: `curated_ispeak_${e.date.getTime()}`,
        title: e.title,
        url: "https://sales.ispeak.com/all-2026-webinars-registration",
        source: "iSpeak",
        date: e.date,
        dimensions: ["clarity", "engagement"],
        description: "Free 60-minute webinar on presentation and communication skills from iSpeak.",
        isCurated: true,
      });
    }
  }

  // Leadership Coach Group — first Friday of each month, noon EST
  for (const date of getUpcomingFirstFridaysOfMonth(now, 3)) {
    entries.push({
      id: `curated_lcg_${date.getTime()}`,
      title: "LCG Open Coaching — Monthly Leadership Session",
      url: "https://www.leadershipcoachgroup.com/open-coaching",
      source: "Leadership Coach Group",
      date,
      dimensions: ["connection", "engagement"],
      description: "Free monthly leadership coaching webinar. Every first Friday at 12 noon EST. Open to all.",
      isCurated: true,
    });
  }

  // Toastmasters — July 23 2026 Club Success Strategies
  const tmDate = new Date("2026-07-23T18:00:00Z");
  if (tmDate > now) {
    entries.push({
      id: "curated_tm_july_2026",
      title: "Club Success Strategies Webinar",
      url: "https://www.toastmasters.org/events/webinars",
      source: "Toastmasters International",
      date: tmDate,
      dimensions: ["engagement", "connection", "clarity"],
      description: "Toastmasters experts share proven techniques to engage members and showcase essential speaking skills.",
      isCurated: true,
    });
  }

  return entries;
}
