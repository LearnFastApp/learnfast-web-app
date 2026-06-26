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
  { dimension: "clarity", title: "How to Give a Killer Presentation", url: "https://hbr.org/2013/06/how-to-give-a-killer-presentation", source: "Harvard Business Review" },
  { dimension: "clarity", title: "First Principles: The Building Blocks of True Knowledge", url: "https://fs.blog/first-principles/", source: "Farnam Street" },
  { dimension: "clarity", title: "How to Start a Presentation: 12 Ways to Keep Them Engaged", url: "https://visme.co/blog/how-to-start-a-presentation/", source: "Visme" },
  { dimension: "clarity", title: "The Pyramid Principle: How to Communicate With Clarity", url: "https://www.myconsultingoffer.org/case-study-interview-prep/pyramid-principle/", source: "My Consulting Offer" },
  { dimension: "clarity", title: "How to Simplify Complex Information for Any Audience", url: "https://www.entrepreneur.com/leadership/how-to-simplify-complex-information-for-any-audience/229935", source: "Entrepreneur" },
  { dimension: "clarity", title: "Verbal Communication Skills: What They Are and How to Improve", url: "https://www.coursera.org/articles/verbal-communication", source: "Coursera" },
  { dimension: "clarity", title: "Presentation Skills: Your Guide to Communicating Ideas Clearly", url: "https://www.coursera.org/articles/presentation-skills", source: "Coursera" },
  { dimension: "clarity", title: "Circle of Competence: Why Knowing What You Don't Know Matters", url: "https://fs.blog/circle-of-competence/", source: "Farnam Street" },

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
  { dimension: "engagement", title: "The Surprising Power of Questions", url: "https://hbr.org/2018/05/the-surprising-power-of-questions", source: "Harvard Business Review" },
  { dimension: "engagement", title: "Storytelling That Moves People", url: "https://hbr.org/2003/06/storytelling-that-moves-people", source: "Harvard Business Review" },
  { dimension: "engagement", title: "How to Hook Your Audience in 30 Seconds", url: "https://www.entrepreneur.com/leadership/how-to-hook-your-audience-in-30-seconds/245761", source: "Entrepreneur" },
  { dimension: "engagement", title: "Active Constructive Responding: A Deeper Form of Listening", url: "https://positivepsychology.com/active-constructive-responding/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Listening Skills: Why Listening Is Important", url: "https://www.skillsyouneed.com/ips/listening-skills.html", source: "Skills You Need" },
  { dimension: "engagement", title: "Interactive Presentations: Techniques to Engage Your Audience", url: "https://visme.co/blog/interactive-presentation/", source: "Visme" },
  { dimension: "engagement", title: "Motivational Interviewing: Listening With Empathy", url: "https://positivepsychology.com/motivational-interviewing/", source: "Positive Psychology" },
  { dimension: "engagement", title: "The Power of Questions: Engaging Your Audience", url: "https://www.entrepreneur.com/leadership/the-power-of-questions-how-asking-the-right-ones-can/243855", source: "Entrepreneur" },

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
  { dimension: "energy", title: "Body Language: Understand and Use Nonverbal Communication", url: "https://www.skillsyouneed.com/ips/body-language.html", source: "Skills You Need" },
  { dimension: "energy", title: "Deliberate Practice: What It Is and Why You Need It", url: "https://fs.blog/deliberate-practice-guide/", source: "Farnam Street" },
  { dimension: "energy", title: "Growth Mindset: How to Develop It and Why It Matters", url: "https://positivepsychology.com/growth-mindset/", source: "Positive Psychology" },
  { dimension: "energy", title: "Self-Determination Theory: Intrinsic Motivation and Confidence", url: "https://positivepsychology.com/self-determination-theory/", source: "Positive Psychology" },
  { dimension: "energy", title: "Executive Presence: What It Is and How to Develop It", url: "https://www.indeed.com/career-advice/career-development/executive-presence", source: "Indeed" },
  { dimension: "energy", title: "Confidence at Work: Projecting Presence and Authority", url: "https://www.indeed.com/career-advice/career-development/confidence-at-work", source: "Indeed" },
  { dimension: "energy", title: "Positive Psychology in the Workplace: Creating a Thriving Environment", url: "https://positivepsychology.com/positive-psychology-workplace/", source: "Positive Psychology" },
  { dimension: "energy", title: "How to Build Resilience and Confidence as a Speaker", url: "https://positivepsychology.com/resilience-in-the-workplace/", source: "Positive Psychology" },

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
  { dimension: "understanding", title: "The Curse of Knowledge: Why Experts Struggle to Explain Things", url: "https://hbr.org/2006/12/the-curse-of-knowledge", source: "Harvard Business Review" },
  { dimension: "understanding", title: "Build Your Knowledge Through Compounding", url: "https://fs.blog/compounding-knowledge/", source: "Farnam Street" },
  { dimension: "understanding", title: "Inversion: The Power of Thinking Backwards", url: "https://fs.blog/inversion/", source: "Farnam Street" },
  { dimension: "understanding", title: "Critical Thinking Skills: Definition and How to Develop Them", url: "https://www.coursera.org/articles/critical-thinking-skills", source: "Coursera" },
  { dimension: "understanding", title: "Critical Thinking: Why It Matters and How to Build It", url: "https://www.indeed.com/career-advice/career-development/critical-thinking-skills", source: "Indeed" },
  { dimension: "understanding", title: "Questioning Skills: How to Ask Better Questions", url: "https://www.skillsyouneed.com/ips/questioning.html", source: "Skills You Need" },
  { dimension: "understanding", title: "Interpersonal Skills: How to Connect With Anyone", url: "https://www.coursera.org/articles/interpersonal-skills", source: "Coursera" },
  { dimension: "understanding", title: "Mindfulness at Work: How to Be More Present and Effective", url: "https://positivepsychology.com/mindfulness-at-work/", source: "Positive Psychology" },

  // ── Connection ───────────────────────────────────────────────────────────
  { dimension: "connection", title: "Social Intelligence: Navigating Social Situations Effectively", url: "https://positivepsychology.com/social-intelligence/", source: "Positive Psychology" },
  { dimension: "connection", title: "How to Build Rapport: 18 Examples and Techniques", url: "https://positivepsychology.com/rapport/", source: "Positive Psychology" },
  { dimension: "connection", title: "Empathy in Communication: How to Connect Authentically", url: "https://positivepsychology.com/empathy/", source: "Positive Psychology" },
  { dimension: "connection", title: "The Secret of Charismatic People", url: "https://www.entrepreneur.com/living/the-secret-of-charismatic-people/234374", source: "Entrepreneur" },
  { dimension: "connection", title: "Building Rapport With Your Audience", url: "https://www.skillsyouneed.com/ips/rapport.html", source: "Skills You Need" },
  { dimension: "connection", title: "How to Build Rapport With Clients: 18 Examples and Questions", url: "https://positivepsychology.com/rapport-building/", source: "Positive Psychology" },
  { dimension: "connection", title: "3 Ways to Build Unbeatable Rapport That Transforms Into Trust", url: "https://www.entrepreneur.com/leadership/3-ways-to-build-unbeatable-rapport-that-transforms-into/457566", source: "Entrepreneur" },
  { dimension: "connection", title: "Authentic Leadership: What It Is and Why It Matters", url: "https://positivepsychology.com/authentic-leadership/", source: "Positive Psychology" },
  { dimension: "connection", title: "How to Improve Your Empathic Listening Skills", url: "https://positivepsychology.com/empathic-listening/", source: "Positive Psychology" },
  { dimension: "connection", title: "Connect, Then Lead", url: "https://hbr.org/2013/07/connect-then-lead", source: "Harvard Business Review" },
  { dimension: "connection", title: "Leadership Skills: Qualities of a Great Leader", url: "https://www.coursera.org/articles/leadership-skills", source: "Coursera" },
  { dimension: "connection", title: "Emotional Intelligence: Why It Matters More Than IQ", url: "https://positivepsychology.com/emotional-intelligence-eq/", source: "Positive Psychology" },
  { dimension: "connection", title: "The Neuroscience of Trust", url: "https://hbr.org/2017/01/the-neuroscience-of-trust", source: "Harvard Business Review" },
  { dimension: "connection", title: "How to Win Friends and Influence People — Key Lessons", url: "https://fs.blog/how-to-win-friends-and-influence-people/", source: "Farnam Street" },
  { dimension: "connection", title: "Empathy: Definition, Types, and How to Practise It", url: "https://www.skillsyouneed.com/ips/empathy.html", source: "Skills You Need" },
  { dimension: "connection", title: "Assertive Communication: Connecting Whilst Standing Your Ground", url: "https://positivepsychology.com/assertive-communication/", source: "Positive Psychology" },
  { dimension: "connection", title: "Active Listening Skills: The Art of Truly Hearing Others", url: "https://www.skillsyouneed.com/ips/active-listening.html", source: "Skills You Need" },
];

export function articlesByDimension(dimension: string, locale = "en") {
  const library = locale === "fr" ? ARTICLES_FR : ARTICLES;
  return library.filter((a) => a.dimension === dimension);
}

export interface ArticleOverride {
  originalUrl: string;
  replacementUrl: string;
  replacementTitle: string;
  replacementSource: string;
  dimension: string;
}

export function applyOverrides(articles: ArticleEntry[], overrides: ArticleOverride[]): ArticleEntry[] {
  if (!overrides.length) return articles;
  const map = new Map(overrides.map((o) => [o.originalUrl, o]));
  return articles.map((a) => {
    const o = map.get(a.url);
    return o ? { ...a, url: o.replacementUrl, title: o.replacementTitle, source: o.replacementSource } : a;
  });
}

// ── French article library ────────────────────────────────────────────────────

export const ARTICLES_FR: ArticleEntry[] = [

  // ── Clarté ───────────────────────────────────────────────────────────────
  { dimension: "clarity", title: "Nancy Duarte : la structure secrète des grands discours", url: "https://www.ted.com/talks/nancy_duarte_the_secret_structure_of_great_talks?language=fr", source: "TED" },
  { dimension: "clarity", title: "Comment structurer une présentation percutante", url: "https://www.skillsyouneed.com/present/presentation-tips.html", source: "Skills You Need" },
  { dimension: "clarity", title: "Compétences en communication : définition et développement", url: "https://www.coursera.org/articles/communication-skills", source: "Coursera" },
  { dimension: "clarity", title: "Présentation : les compétences pour communiquer clairement", url: "https://www.coursera.org/articles/presentation-skills", source: "Coursera" },
  { dimension: "clarity", title: "La technique Feynman : tout expliquer simplement", url: "https://fs.blog/feynman-technique/", source: "Farnam Street" },
  { dimension: "clarity", title: "Prise de parole en public : les fondamentaux", url: "https://www.coursera.org/articles/public-speaking", source: "Coursera" },
  { dimension: "clarity", title: "La clarté dans l'expression : le fondement d'une bonne communication", url: "https://www.skillsyouneed.com/write/clarity.html", source: "Skills You Need" },
  { dimension: "clarity", title: "Stratégies de communication : mieux vous connecter à votre auditoire", url: "https://www.coursera.org/articles/strategies-in-communication", source: "Coursera" },
  { dimension: "clarity", title: "Qu'est-ce qu'une communication efficace ?", url: "https://www.coursera.org/articles/communication-effectiveness", source: "Coursera" },
  { dimension: "clarity", title: "Comment réussir une présentation à coup sûr", url: "https://hbr.org/2013/06/how-to-give-a-killer-presentation", source: "Harvard Business Review" },

  // ── Engagement ───────────────────────────────────────────────────────────
  { dimension: "engagement", title: "Julian Treasure : parler pour que les autres veuillent écouter", url: "https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen?language=fr", source: "TED" },
  { dimension: "engagement", title: "Simon Sinek : comment les grands leaders inspirent l'action", url: "https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action?language=fr", source: "TED" },
  { dimension: "engagement", title: "L'écoute active : la base de toute communication réussie", url: "https://positivepsychology.com/active-listening/", source: "Positive Psychology" },
  { dimension: "engagement", title: "L'art du storytelling qui émeut et persuade", url: "https://hbr.org/2003/06/storytelling-that-moves-people", source: "Harvard Business Review" },
  { dimension: "engagement", title: "Donner des présentations plus engageantes", url: "https://www.skillsyouneed.com/rhubarb/engaging-presentations.html", source: "Skills You Need" },
  { dimension: "engagement", title: "La puissance des questions pour engager votre auditoire", url: "https://hbr.org/2018/05/the-surprising-power-of-questions", source: "Harvard Business Review" },
  { dimension: "engagement", title: "Compétences en communication : l'art de se connecter", url: "https://positivepsychology.com/communication-skills/", source: "Positive Psychology" },
  { dimension: "engagement", title: "Compétences interpersonnelles : guide pratique", url: "https://www.coursera.org/articles/interpersonal-skills", source: "Coursera" },
  { dimension: "engagement", title: "Techniques d'écoute active pour vraiment entendre votre public", url: "https://positivepsychology.com/active-listening-techniques/", source: "Positive Psychology" },
  { dimension: "engagement", title: "L'écoute empathique : comment améliorer vos compétences", url: "https://positivepsychology.com/empathic-listening/", source: "Positive Psychology" },

  // ── Énergie ──────────────────────────────────────────────────────────────
  { dimension: "energy", title: "Kelly McGonigal : comment faire du stress votre allié", url: "https://www.ted.com/talks/kelly_mcgonigal_how_to_make_stress_your_friend?language=fr", source: "TED" },
  { dimension: "energy", title: "Amy Cuddy : le langage du corps façonne qui vous êtes", url: "https://www.ted.com/talks/amy_cuddy_your_body_language_may_shape_who_you_are?language=fr", source: "TED" },
  { dimension: "energy", title: "Développer votre confiance en vous pour mieux parler en public", url: "https://positivepsychology.com/self-confidence/", source: "Positive Psychology" },
  { dimension: "energy", title: "Communication non verbale : ce que dit votre corps", url: "https://positivepsychology.com/nonverbal-communication/", source: "Positive Psychology" },
  { dimension: "energy", title: "Surmonter le trac : techniques de préparation mentale", url: "https://positivepsychology.com/performance-anxiety/", source: "Positive Psychology" },
  { dimension: "energy", title: "Adopter un état d'esprit de croissance comme orateur", url: "https://positivepsychology.com/growth-mindset/", source: "Positive Psychology" },
  { dimension: "energy", title: "Comment bâtir sa résilience d'orateur", url: "https://positivepsychology.com/resilience-in-the-workplace/", source: "Positive Psychology" },
  { dimension: "energy", title: "La présence exécutive : ce que c'est et comment la développer", url: "https://www.indeed.com/career-advice/career-development/executive-presence", source: "Indeed" },
  { dimension: "energy", title: "La pratique délibérée : comment progresser vraiment", url: "https://fs.blog/deliberate-practice-guide/", source: "Farnam Street" },
  { dimension: "energy", title: "Prise de parole efficace : faire passer votre message", url: "https://www.skillsyouneed.com/ips/effective-speaking.html", source: "Skills You Need" },

  // ── Compréhension ────────────────────────────────────────────────────────
  { dimension: "understanding", title: "Hans Rosling : transformer des données en récits compréhensibles", url: "https://www.ted.com/talks/hans_rosling_the_best_stats_you_ve_ever_seen?language=fr", source: "TED" },
  { dimension: "understanding", title: "Les modèles mentaux pour mieux faire comprendre vos idées", url: "https://fs.blog/mental-models/", source: "Farnam Street" },
  { dimension: "understanding", title: "Pensée critique : définition et comment la développer", url: "https://www.coursera.org/articles/critical-thinking-skills", source: "Coursera" },
  { dimension: "understanding", title: "Communication interpersonnelle : engager et persuader", url: "https://positivepsychology.com/interpersonal-communication/", source: "Positive Psychology" },
  { dimension: "understanding", title: "Comment améliorer ses compétences en communication", url: "https://positivepsychology.com/how-to-improve-communication-skills/", source: "Positive Psychology" },
  { dimension: "understanding", title: "Les obstacles à une communication efficace", url: "https://www.skillsyouneed.com/ips/barriers-communication.html", source: "Skills You Need" },
  { dimension: "understanding", title: "Compétences de communication : vue d'ensemble", url: "https://www.skillsyouneed.com/ips/communication-skills.html", source: "Skills You Need" },
  { dimension: "understanding", title: "Les premiers principes : les fondations de la vraie connaissance", url: "https://fs.blog/first-principles/", source: "Farnam Street" },
  { dimension: "understanding", title: "La malédiction de la connaissance : pourquoi les experts peinent à expliquer", url: "https://hbr.org/2006/12/the-curse-of-knowledge", source: "Harvard Business Review" },
  { dimension: "understanding", title: "Leadership et communication : adapter son message à son public", url: "https://www.coursera.org/articles/leadership-skills", source: "Coursera" },

  // ── Connexion ────────────────────────────────────────────────────────────
  { dimension: "connection", title: "Celeste Headlee : 10 façons d'avoir de meilleures conversations", url: "https://www.ted.com/talks/celeste_headlee_10_ways_to_have_a_better_conversation?language=fr", source: "TED" },
  { dimension: "connection", title: "Brené Brown : la puissance de la vulnérabilité", url: "https://www.ted.com/talks/brene_brown_the_power_of_vulnerability?language=fr", source: "TED" },
  { dimension: "connection", title: "Créer du lien avec son audience : une compétence fondamentale", url: "https://hbr.org/2013/07/connect-then-lead", source: "Harvard Business Review" },
  { dimension: "connection", title: "Créer une relation authentique avec votre public", url: "https://positivepsychology.com/rapport/", source: "Positive Psychology" },
  { dimension: "connection", title: "Empathie et communication : se mettre à la place de son public", url: "https://positivepsychology.com/empathy/", source: "Positive Psychology" },
  { dimension: "connection", title: "La neuroscience de la confiance : comment l'instaurer", url: "https://hbr.org/2017/01/the-neuroscience-of-trust", source: "Harvard Business Review" },
  { dimension: "connection", title: "Comment gagner des amis et influencer les autres", url: "https://fs.blog/how-to-win-friends-and-influence-people/", source: "Farnam Street" },
  { dimension: "connection", title: "Construire des relations solides : stratégies pratiques", url: "https://positivepsychology.com/rapport-building/", source: "Positive Psychology" },
  { dimension: "connection", title: "Le leadership authentique pour inspirer la confiance", url: "https://positivepsychology.com/authentic-leadership/", source: "Positive Psychology" },
  { dimension: "connection", title: "Intelligence émotionnelle : pourquoi c'est plus important que le QI", url: "https://positivepsychology.com/emotional-intelligence-eq/", source: "Positive Psychology" },
];
