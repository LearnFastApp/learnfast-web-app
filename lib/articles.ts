export interface ArticleEntry {
  title: string;
  url: string;
  source: string;
  dimension: string;
}

export const ARTICLES: ArticleEntry[] = [
  // ── Clarity ──────────────────────────────────────────────────────────────
  { dimension: "clarity", title: "How to Structure a Presentation That's Easy to Follow", url: "https://visme.co/blog/presentation-tips/", source: "Visme" },
  { dimension: "clarity", title: "The Feynman Technique: Explain Anything Simply", url: "https://fs.blog/feynman-technique/", source: "Farnam Street" },
  { dimension: "clarity", title: "Communication Skills: What They Are and How to Improve", url: "https://www.coursera.org/articles/communication-skills", source: "Coursera" },
  { dimension: "clarity", title: "How to End a Presentation With Impact", url: "https://visme.co/blog/how-to-end-a-presentation/", source: "Visme" },
  { dimension: "clarity", title: "Presentation Tips for Clearer Communication", url: "https://www.skillsyouneed.com/present/presentation-tips.html", source: "Skills You Need" },
  { dimension: "clarity", title: "Strategies in Communication: Your Guide to Better Connections", url: "https://www.coursera.org/articles/strategies-in-communication", source: "Coursera" },
  { dimension: "clarity", title: "What Is Effective Communication? Skills for Work, School, and Life", url: "https://www.coursera.org/articles/communication-effectiveness", source: "Coursera" },
  { dimension: "clarity", title: "Communication Skills: An Overview", url: "https://www.skillsyouneed.com/ips/communication-skills.html", source: "Skills You Need" },
  { dimension: "clarity", title: "Clarity in Writing: The Foundation of Clear Communication", url: "https://www.skillsyouneed.com/write/clarity.html", source: "Skills You Need" },

  // ── Engagement ───────────────────────────────────────────────────────────
  { dimension: "engagement", title: "Active Listening: The Art of Empathetic Conversation", url: "https://positivepsychology.com/active-listening/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Communication Skills: The Art of Connecting", url: "https://positivepsychology.com/communication-skills/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Public Speaking: How to Inform and Inspire", url: "https://www.coursera.org/articles/public-speaking", source: "Coursera" },
  { dimension: "engagement", title: "How to Give Engaging Presentations", url: "https://www.entrepreneur.com/leadership/how-to-give-engaging-presentations/299983", source: "Entrepreneur" },
  { dimension: "engagement", title: "20 Public Speaking Tips With Great Examples", url: "https://visme.co/blog/public-speaking-tips/", source: "Visme" },
  { dimension: "engagement", title: "How to Engage an Audience in an Online Presentation", url: "https://visme.co/blog/engage-audience-online-presentation/", source: "Visme" },
  { dimension: "engagement", title: "10 Ways to Engage Your Audience During an Important Meeting", url: "https://www.entrepreneur.com/leadership/10-ways-to-engage-your-audience-during-an-important-meeting/242899", source: "Entrepreneur" },
  { dimension: "engagement", title: "7 Ways to Captivate Any Audience", url: "https://www.entrepreneur.com/leadership/7-ways-to-captivate-any-audience/369197", source: "Entrepreneur" },
  { dimension: "engagement", title: "Giving More Engaging Presentations", url: "https://www.skillsyouneed.com/rhubarb/engaging-presentations.html", source: "Skills You Need" },

  // ── Energy ───────────────────────────────────────────────────────────────
  { dimension: "energy", title: "Vocal Power: How to Command a Room With Your Voice", url: "https://www.entrepreneur.com/leadership/vocal-power-how-to-command-a-room-with-your-voice/299987", source: "Entrepreneur" },
  { dimension: "energy", title: "Body Language Tips for Speakers", url: "https://www.entrepreneur.com/leadership/body-language-tips-for-speakers/299986", source: "Entrepreneur" },
  { dimension: "energy", title: "What Is Self-Confidence? 9 Proven Ways to Increase It", url: "https://positivepsychology.com/self-confidence/", source: "Positive Psychology" },
  { dimension: "energy", title: "Nonverbal Communication Skills: What the Research Says", url: "https://positivepsychology.com/nonverbal-communication/", source: "Positive Psychology" },
  { dimension: "energy", title: "10 Tips for Effective Public Speaking", url: "https://www.entrepreneur.com/leadership/10-tips-for-effective-public-speaking/227713", source: "Entrepreneur" },
  { dimension: "energy", title: "7 Effective Delivery Skills for Public Speaking", url: "https://www.entrepreneur.com/growing-a-business/7-delivery-skills-for-public-speaking-dynamiccommunication/290445", source: "Entrepreneur" },
  { dimension: "energy", title: "Sound Advice: How to Make Your Voice More Effective", url: "https://www.entrepreneur.com/growing-a-business/sound-advice-how-to-make-your-voice-more-effective/228515", source: "Entrepreneur" },
  { dimension: "energy", title: "How to Overcome Performance Anxiety as a Speaker", url: "https://positivepsychology.com/performance-anxiety/", source: "Positive Psychology" },
  { dimension: "energy", title: "Presentation Skills for Professionals", url: "https://www.skillsyouneed.com/rhubarb/presentation-skills-professionals.html", source: "Skills You Need" },

  // ── Understanding ────────────────────────────────────────────────────────
  { dimension: "understanding", title: "The Feynman Technique: Make Complex Ideas Stick", url: "https://fs.blog/feynman-technique/", source: "Farnam Street" },
  { dimension: "understanding", title: "Active Listening Techniques: How to Really Hear Your Audience", url: "https://positivepsychology.com/active-listening-techniques/", source: "Positive Psychology" },
  { dimension: "understanding", title: "7 Tips for Improving Public Speaking Skills", url: "https://www.entrepreneur.com/leadership/7-tips-for-improving-public-speaking-skills/299980", source: "Entrepreneur" },
  { dimension: "understanding", title: "Interpersonal Communication: How to Engage and Persuade", url: "https://positivepsychology.com/interpersonal-communication/", source: "Positive Psychology" },
  { dimension: "understanding", title: "Effective Speaking: Getting Your Message Across Clearly", url: "https://www.skillsyouneed.com/ips/effective-speaking.html", source: "Skills You Need" },
  { dimension: "understanding", title: "How to Improve Communication Skills: 14 Best Worksheets", url: "https://positivepsychology.com/how-to-improve-communication-skills/", source: "Positive Psychology" },
  { dimension: "understanding", title: "Barriers to Effective Communication", url: "https://www.skillsyouneed.com/ips/barriers-communication.html", source: "Skills You Need" },
  { dimension: "understanding", title: "Mental Models: The Best Way to Make Intelligent Decisions", url: "https://fs.blog/mental-models/", source: "Farnam Street" },
  { dimension: "understanding", title: "Knowledge Makes Everything Simpler", url: "https://fs.blog/knowledge-makes-everything-simpler/", source: "Farnam Street" },

  // ── Connection ───────────────────────────────────────────────────────────
  { dimension: "connection", title: "Social Connection: Why It Matters and How to Build It", url: "https://positivepsychology.com/social-connection/", source: "Positive Psychology" },
  { dimension: "connection", title: "How to Build Rapport: 18 Examples and Techniques", url: "https://positivepsychology.com/rapport/", source: "Positive Psychology" },
  { dimension: "connection", title: "Empathy in Communication: How to Connect Authentically", url: "https://positivepsychology.com/empathy/", source: "Positive Psychology" },
  { dimension: "connection", title: "The Secret of Charismatic People", url: "https://www.entrepreneur.com/living/the-secret-of-charismatic-people/234374", source: "Entrepreneur" },
  { dimension: "connection", title: "Building Rapport With Your Audience", url: "https://www.skillsyouneed.com/ips/rapport.html", source: "Skills You Need" },
  { dimension: "connection", title: "How to Build Rapport With Clients: 18 Examples and Questions", url: "https://positivepsychology.com/rapport-building/", source: "Positive Psychology" },
  { dimension: "connection", title: "3 Ways to Build Unbeatable Rapport That Transforms Into Trust", url: "https://www.entrepreneur.com/leadership/3-ways-to-build-unbeatable-rapport-that-transforms-into/457566", source: "Entrepreneur" },
  { dimension: "connection", title: "Authentic Leadership: What It Is and Why It Matters", url: "https://positivepsychology.com/authentic-leadership/", source: "Positive Psychology" },
  { dimension: "connection", title: "How to Improve Your Empathic Listening Skills", url: "https://positivepsychology.com/empathic-listening/", source: "Positive Psychology" },
];

export function articlesByDimension(dimension: string) {
  return ARTICLES.filter((a) => a.dimension === dimension);
}
