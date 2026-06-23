export interface ArticleEntry {
  title: string;
  url: string;
  source: string;
  dimension: string;
}

export const ARTICLES: ArticleEntry[] = [
  // Clarity
  { dimension: "clarity", title: "How to Structure a Presentation That's Easy to Follow", url: "https://visme.co/blog/presentation-tips/", source: "Visme" },
  { dimension: "clarity", title: "The Feynman Technique: Explain Anything Simply", url: "https://fs.blog/feynman-technique/", source: "Farnam Street" },
  { dimension: "clarity", title: "Communication Skills: What They Are and How to Improve", url: "https://www.coursera.org/articles/communication-skills", source: "Coursera" },
  { dimension: "clarity", title: "How to End a Presentation With Impact", url: "https://visme.co/blog/how-to-end-a-presentation/", source: "Visme" },
  { dimension: "clarity", title: "Presentation Tips for Clearer Communication", url: "https://www.skillsyouneed.com/present/presentation-tips.html", source: "Skills You Need" },

  // Engagement
  { dimension: "engagement", title: "Active Listening: The Art of Empathetic Conversation", url: "https://positivepsychology.com/active-listening/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Communication Skills: The Art of Connecting", url: "https://positivepsychology.com/communication-skills/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Public Speaking: How to Inform and Inspire", url: "https://www.coursera.org/articles/public-speaking", source: "Coursera" },
  { dimension: "engagement", title: "How to Give Engaging Presentations", url: "https://www.entrepreneur.com/leadership/how-to-give-engaging-presentations/299983", source: "Entrepreneur" },
  { dimension: "engagement", title: "20 Public Speaking Tips With Great Examples", url: "https://visme.co/blog/public-speaking-tips/", source: "Visme" },

  // Energy
  { dimension: "energy", title: "Vocal Power: How to Command a Room With Your Voice", url: "https://www.entrepreneur.com/leadership/vocal-power-how-to-command-a-room-with-your-voice/299987", source: "Entrepreneur" },
  { dimension: "energy", title: "Body Language Tips for Speakers", url: "https://www.entrepreneur.com/leadership/body-language-tips-for-speakers/299986", source: "Entrepreneur" },
  { dimension: "energy", title: "What Is Self-Confidence? 9 Proven Ways to Increase It", url: "https://positivepsychology.com/self-confidence/", source: "Positive Psychology" },
  { dimension: "energy", title: "Nonverbal Communication Skills: What the Research Says", url: "https://positivepsychology.com/nonverbal-communication/", source: "Positive Psychology" },
  { dimension: "energy", title: "10 Tips for Effective Public Speaking", url: "https://www.entrepreneur.com/leadership/10-tips-for-effective-public-speaking/227713", source: "Entrepreneur" },

  // Understanding
  { dimension: "understanding", title: "The Feynman Technique: Make Complex Ideas Stick", url: "https://fs.blog/feynman-technique/", source: "Farnam Street" },
  { dimension: "understanding", title: "Active Listening Techniques: How to Really Hear Your Audience", url: "https://positivepsychology.com/active-listening-techniques/", source: "Positive Psychology" },
  { dimension: "understanding", title: "7 Tips for Improving Public Speaking Skills", url: "https://www.entrepreneur.com/leadership/7-tips-for-improving-public-speaking-skills/299980", source: "Entrepreneur" },
  { dimension: "understanding", title: "Interpersonal Communication: How to Engage and Persuade", url: "https://positivepsychology.com/interpersonal-communication/", source: "Positive Psychology" },
  { dimension: "understanding", title: "Effective Speaking: Getting Your Message Across Clearly", url: "https://www.skillsyouneed.com/ips/effective-speaking.html", source: "Skills You Need" },

  // Connection
  { dimension: "connection", title: "Social Connection: Why It Matters and How to Build It", url: "https://positivepsychology.com/social-connection/", source: "Positive Psychology" },
  { dimension: "connection", title: "How to Build Rapport: 18 Examples and Techniques", url: "https://positivepsychology.com/rapport/", source: "Positive Psychology" },
  { dimension: "connection", title: "Empathy in Communication: How to Connect Authentically", url: "https://positivepsychology.com/empathy/", source: "Positive Psychology" },
  { dimension: "connection", title: "The Secret of Charismatic People", url: "https://www.entrepreneur.com/living/the-secret-of-charismatic-people/234374", source: "Entrepreneur" },
  { dimension: "connection", title: "Building Rapport With Your Audience", url: "https://www.skillsyouneed.com/ips/rapport.html", source: "Skills You Need" },
];

export function articlesByDimension(dimension: string) {
  return ARTICLES.filter((a) => a.dimension === dimension);
}
