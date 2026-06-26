import { ArticleEntry } from "./articles";

// Supplementary pool of verified-working backup URLs (HTTP-checked 2026-06-26).
// Used by check-resources auto-repair when a primary or override article breaks.
// Each entry carries the most appropriate dimension but may serve others too.
export const ARTICLE_POOL: ArticleEntry[] = [
  // ── Clarity ───────────────────────────────────────────────────────────────
  { dimension: "clarity", title: "Verbal Communication Skills: What They Are and How to Improve", url: "https://www.coursera.org/articles/verbal-communication", source: "Coursera" },
  { dimension: "clarity", title: "Circle of Competence: Why Knowing What You Don't Know Matters", url: "https://fs.blog/circle-of-competence/", source: "Farnam Street" },
  { dimension: "clarity", title: "Inversion: The Power of Thinking Backwards", url: "https://fs.blog/inversion/", source: "Farnam Street" },
  { dimension: "clarity", title: "Build Your Knowledge Through Compounding", url: "https://fs.blog/compounding-knowledge/", source: "Farnam Street" },

  // ── Engagement ────────────────────────────────────────────────────────────
  { dimension: "engagement", title: "Active Listening Skills: The Art of Truly Hearing Others", url: "https://www.skillsyouneed.com/ips/active-listening.html", source: "Skills You Need" },
  { dimension: "engagement", title: "Listening Skills: Why Listening Is Important", url: "https://www.skillsyouneed.com/ips/listening-skills.html", source: "Skills You Need" },
  { dimension: "engagement", title: "Questioning Skills and Techniques", url: "https://www.skillsyouneed.com/ips/questioning.html", source: "Skills You Need" },
  { dimension: "engagement", title: "Assertive Communication: How to Get Your Point Across", url: "https://positivepsychology.com/assertive-communication/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Active Constructive Responding: A Deeper Form of Listening", url: "https://positivepsychology.com/active-constructive-responding/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Motivational Interviewing: Listening With Empathy", url: "https://positivepsychology.com/motivational-interviewing/", source: "Positive Psychology" },

  // ── Energy ────────────────────────────────────────────────────────────────
  { dimension: "energy", title: "Body Language: Understand and Use Nonverbal Communication", url: "https://www.skillsyouneed.com/ips/body-language.html", source: "Skills You Need" },
  { dimension: "energy", title: "Confidence at Work: Projecting Presence and Authority", url: "https://www.indeed.com/career-advice/career-development/confidence-at-work", source: "Indeed" },
  { dimension: "energy", title: "Self-Determination Theory: Intrinsic Motivation Explained", url: "https://positivepsychology.com/self-determination-theory/", source: "Positive Psychology" },

  // ── Understanding ─────────────────────────────────────────────────────────
  { dimension: "understanding", title: "Inversion: The Power of Thinking Backwards", url: "https://fs.blog/inversion/", source: "Farnam Street" },
  { dimension: "understanding", title: "Build Your Knowledge Through Compounding", url: "https://fs.blog/compounding-knowledge/", source: "Farnam Street" },
  { dimension: "understanding", title: "Verbal Communication: How to Express Your Ideas Clearly", url: "https://www.coursera.org/articles/verbal-communication", source: "Coursera" },
  { dimension: "understanding", title: "Questioning Skills: How to Ask Better Questions", url: "https://www.skillsyouneed.com/ips/questioning.html", source: "Skills You Need" },

  // ── Connection ────────────────────────────────────────────────────────────
  { dimension: "connection", title: "Empathy: Definition, Types, and How to Practise It", url: "https://www.skillsyouneed.com/ips/empathy.html", source: "Skills You Need" },
  { dimension: "connection", title: "Social Intelligence: Navigating Social Situations Effectively", url: "https://positivepsychology.com/social-intelligence/", source: "Positive Psychology" },
  { dimension: "connection", title: "Assertive Communication: Connecting Whilst Standing Your Ground", url: "https://positivepsychology.com/assertive-communication/", source: "Positive Psychology" },
  { dimension: "connection", title: "Active Listening: The Art of Empathetic Conversation", url: "https://www.skillsyouneed.com/ips/active-listening.html", source: "Skills You Need" },
];
