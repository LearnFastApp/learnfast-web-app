// Bilingual copy for the personal landing page (components/landing-page.tsx).
// Structural data (icons, colors, citation years, prices) stays in the page
// component since it doesn't change by locale — this file holds only the
// translatable text, in the same order as the structural arrays it pairs with.

export type LandingLocale = "en" | "fr";

interface TitleBody { title: string; body: string; }
interface DimensionText { name: string; desc: string; }
interface SignalText { label: string; title: string; body: string; }
interface CardText { title: string; body: string; }

export interface LandingCopy {
  nav: {
    product: string;
    howItWorks: string;
    pricing: string;
    why: string;
    signIn: string;
    freeAiAssessment: string;
    startFree: string;
  };
  hero: {
    eyebrow: string;
    personal: string;
    business: string;
    italic: string;
    h1: string;
    body: string;
    footnote: string;
    cta1: string;
    cta2: string;
  };
  tagline: string;
  threeSignal: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    sub: string;
    signals: SignalText[];
    quote: string;
  };
  features: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    items: TitleBody[];
  };
  howItWorks: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    steps: TitleBody[];
  };
  aiSpotlight: {
    label: string;
    h2Light: string;
    h2Bold: string;
    body: string;
    items: CardText[];
    cta: string;
    footnote: string;
  };
  rehearsalSpotlight: {
    label: string;
    h2Light: string;
    h2Bold: string;
    body: string;
    items: CardText[];
    cta: string;
    footnote: string;
  };
  leaderboards: {
    label: string;
    h2Light: string;
    h2Bold: string;
    body: string;
    bullets: string[];
    cta: string;
    mockupCategory: string;
    mockupNickname: string;
    mockupScore: string;
    mockupPercentile: string;
    mockupYou: string;
    mockupCaption: string;
  };
  dimensionsSection: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    body: string;
    dimensions: DimensionText[];
    footerCard: string;
  };
  freeCta: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    body1: string;
    body2: string;
    cards: CardText[];
    cta: string;
    footnote: string;
  };
  pricing: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    free: { label: string; footnote: string; features: string[]; cta: string };
    lite: { badge: string; label: string; perMo: string; footnote: string; features: string[]; cta: string; note: string };
    pro: {
      badge: string;
      label: string;
      perMo: string;
      footnote: string;
      features: string[];
      emailPlaceholder: string;
      saving: string;
      notifyCta: string;
      submittedTitle: string;
      submittedBody: string;
    };
    teamLine: string;
    teamCta: string;
  };
  finalCta: {
    eyebrow: string;
    h2Light: string;
    h2Bold: string;
    cta: string;
    footnote: string;
  };
  footer: {
    contact: string;
    navigation: string;
    navItems: string[];
    followUs: string;
    startNow: string;
    copyright: (year: number) => string;
    privacy: string;
    terms: string;
    security: string;
    dpa: string;
  };
}

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = {
  en: {
    nav: {
      product: "PRODUCT",
      howItWorks: "HOW IT WORKS",
      pricing: "PRICING",
      why: "WHY",
      signIn: "Sign in",
      freeAiAssessment: "FREE AI ASSESSMENT",
      startFree: "START FREE →",
    },
    hero: {
      eyebrow: "AI-Powered Presentation Intelligence",
      personal: "Personal",
      business: "Business",
      italic: "never walk out of another meeting wondering if your message has landed",
      h1: "THE LEARNFAST APP",
      body: "The only platform that combines AI analysis, live audience feedback and self-reflection into a single coaching intelligence — scored across the five dimensions of great presenting.",
      footnote: "No download required · works on any device · available in English and French.",
      cta1: "START FREE — 2 SESSIONS ON US",
      cta2: "TRY FREE — NO ACCOUNT NEEDED →",
    },
    tagline: "Your ideas are only as powerful as how they are delivered",
    threeSignal: {
      eyebrow: "Proprietary Methodology",
      h2Light: "THE THREE-SIGNAL",
      h2Bold: "INTELLIGENCE MODEL",
      sub: "Most feedback tools give you one perspective. LearnFast gives you three — simultaneously. Where they diverge is where your growth lives.",
      signals: [
        { label: "AI", title: "The Recording", body: "Upload your recording and an AI scores you across all five dimensions. Vocal statistics, exact quotes from your transcript, and specific improvement tips — delivered in minutes." },
        { label: "Audience", title: "The Room", body: "Your audience scores you in real time via QR code. Completely anonymous. What they actually felt — not what they were polite enough to say." },
        { label: "Self", title: "Your Perception", body: "How did YOU think it went? Your self-assessment alongside AI and audience scores reveals whether your internal compass is calibrated — or not." },
      ],
      quote: "The gap between how you think you performed and how your audience actually experienced you is the single most important data point in your development as a presenter.",
    },
    features: {
      eyebrow: "Everything You Need",
      h2Light: "BUILT FOR",
      h2Bold: "SERIOUS PRESENTERS",
      items: [
        { title: "AI Assessment", body: "Upload your recording and receive AI-scored coaching across all five dimensions in 1–3 minutes. Vocal stats, highlight quotes, improvement tips and a full written rationale — all from a single file." },
        { title: "Rehearsal Mode", body: "Practice take by take with Richard Greene-style AI coaching between every attempt. Script improvement suggestions, take-by-take score tracking, and a save-your-best-take flow — built for serious preparation." },
        { title: "Three-Signal Intelligence", body: "Combine AI scores, live audience feedback and your own self-reflection on a single radar. Where the three signals diverge is exactly where your growth lives." },
        { title: "Comparative Coaching", body: "Your AI feedback evolves with every session. Each new assessment references your full history — noting improvements, calling out persistent patterns and adapting advice to your trajectory." },
        { title: "Industry Leaderboards", body: "See how you rank against peers in your sector. Leaderboards by dimension — Clarity, Energy, Connection and more — updated with every AI assessment you complete." },
        { title: "Dimension-Matched Resources", body: "Based on YOUR scores, LearnFast surfaces the most relevant articles, TED Talks, videos and podcasts — matched to your exact development areas, not a generic library." },
        { title: "Executive Coach Roster", body: "Book a 1-to-1 session with a vetted communication coach, filtered by specialism — executive presence, pitch coaching, storytelling, data communication and more. Your LearnFast scores tell them exactly where to focus." },
      ],
    },
    howItWorks: {
      eyebrow: "Simple by Design",
      h2Light: "HOW IT",
      h2Bold: "WORKS",
      steps: [
        { title: "Create a Session", body: "Name your session and get a unique QR code and join link in seconds." },
        { title: "Share With Your Audience", body: "Display the QR or share the link. No app download, no account needed for your audience." },
        { title: "Collect Live Feedback", body: "Watch scores arrive in real time across all 5 dimensions as your audience responds." },
        { title: "Reflect, Track & Improve", body: "Self-score, add an AI assessment of your recording, and watch LearnFast surface the exact resources to close your gaps." },
      ],
    },
    aiSpotlight: {
      label: "AI Assessment",
      h2Light: "YOUR RECORDING.",
      h2Bold: "YOUR COACHING. IN MINUTES.",
      body: "Upload any recording from a meeting, talk or practice session. Our AI transcribes the audio, scores your delivery across all five dimensions, and generates a detailed coaching report — complete with exact quotes from your transcript, vocal statistics and targeted improvement tips.",
      items: [
        { title: "Vocal statistics", body: "Words per minute, filler word count, speaking duration and sentiment analysis." },
        { title: "Transcript highlights", body: "Exact quotes from your session flagged as strengths or development opportunities." },
        { title: "Dimension rationale", body: "A written explanation of every score — not just a number, but the reasoning behind it." },
        { title: "Coaching tips", body: "Targeted, actionable advice for your three lowest-scoring dimensions." },
        { title: "Comparative feedback", body: "Each assessment references your history — noting progress, regression and persistent patterns." },
        { title: "Industry context", body: "Your coaching is tailored to your professional sector for relevant, contextual advice." },
      ],
      cta: "START FREE NOW",
      footnote: "3 AI assessments per month on Lite · Unlimited on Pro",
    },
    rehearsalSpotlight: {
      label: "Rehearsal Mode",
      h2Light: "PRACTICE. GET COACHED.",
      h2Bold: "IMPROVE. REPEAT.",
      body: "Rehearsal Mode turns LearnFast into your personal preparation studio. Record or upload a take, receive specific AI coaching on your weakest dimensions, then go again — with precise direction on exactly what to improve. Take by take, you get better.",
      items: [
        { title: "Take-by-take progression", body: "Every take is scored and compared directly to your last. Watch your numbers move in real time as your delivery sharpens." },
        { title: "Coaching between every take", body: "Not generic tips — specific, high-standard direction. The kind of feedback you'd get from a world-class presentation coach." },
        { title: "Script improvement suggestions", body: "Request an AI rewrite of your script targeting your lowest-scoring dimensions. Your voice stays intact — your words get sharper." },
        { title: "Save your best take", body: "When you've hit your peak, save that take to your assessment history and continue tracking your long-term development." },
      ],
      cta: "START REHEARSING FREE →",
      footnote: "1 free session · 3 sessions/month on Lite · Unlimited on Pro",
    },
    leaderboards: {
      label: "Premium Feature",
      h2Light: "INDUSTRY",
      h2Bold: "LEADERBOARDS",
      body: "See how you rank against peers in your sector. LearnFast builds real normative data from every AI assessment run on the platform — so your score isn't just a number, it's a percentile rank against Sales professionals, Healthcare leaders, Technology engineers and more.",
      bullets: [
        "Ranked by dimension — Overall, Clarity, Energy, Engagement, Understanding, Connection",
        "Percentile position against professionals in your industry",
        "Anonymous by default — appear under a chosen nickname",
        "Updated with every AI assessment you complete",
        "Industry normative benchmarks build with every new user",
      ],
      cta: "GET STARTED →",
      mockupCategory: "Sales & Business Development",
      mockupNickname: "Nickname",
      mockupScore: "Score",
      mockupPercentile: "%ile",
      mockupYou: "You",
      mockupCaption: "Based on most recent AI assessment · Connection dimension",
    },
    dimensionsSection: {
      eyebrow: "Scored Across",
      h2Light: "THE",
      h2Bold: "5 DIMENSIONS",
      body: "Every signal — AI, audience and self-reflection — scores you across the same five dimensions. One framework. Three perspectives. The complete picture.",
      dimensions: [
        { name: "Clarity", desc: "How clearly your message and structure came across to the room." },
        { name: "Energy", desc: "The presence, vocal delivery and energy you brought to the room." },
        { name: "Engagement", desc: "How well you held attention and kept the audience invested throughout." },
        { name: "Understanding", desc: "How well the audience grasped the core ideas you shared." },
        { name: "Connection", desc: "How personally connected the audience felt to you and your content." },
      ],
      footerCard: "AI + Audience + Self-Reflection, all on one radar. The gaps between signals reveal your blind spots and your hidden strengths.",
    },
    freeCta: {
      eyebrow: "No account required",
      h2Light: "SEE EXACTLY",
      h2Bold: "HOW YOU SCORE",
      body1: "Record or upload 90 seconds of any talk, meeting or presentation. Our AI delivers a full coaching report across all five dimensions — free, instant, no signup needed.",
      body2: "The same AI that powers the full LearnFast platform. No simplified version.",
      cards: [
        { title: "Your communication archetype", body: "One of six evidence-based profiles that defines your delivery style and your primary growth lever." },
        { title: "Scores across all 5 dimensions", body: "Clarity, Energy, Engagement, Understanding and Connection — each scored against professional presentation norms." },
        { title: "Full AI coaching report", body: "Specific rationale for every score, your strongest moments pulled from the transcript, and targeted tips for your lowest dimension." },
      ],
      cta: "GET MY FREE AI SCORE →",
      footnote: "90 seconds · instant results · no credit card",
    },
    pricing: {
      eyebrow: "Pricing",
      h2Light: "START FREE,",
      h2Bold: "SCALE WHEN READY",
      free: {
        label: "Free",
        footnote: "No credit card required",
        features: [
          "2 feedback sessions",
          "All 5 scoring dimensions",
          "Real-time audience radar chart",
          "Presenter self-reflection scores",
          "Three-signal comparison view",
          "Session notes & tags",
          "Reflective practice log",
          "1 rehearsal session (3 takes)",
        ],
        cta: "GET STARTED FREE →",
      },
      lite: {
        badge: "MOST POPULAR",
        label: "Lite",
        perMo: "/mo",
        footnote: "7-day free trial · cancel anytime",
        features: [
          "Unlimited sessions",
          "Everything in Free",
          "3 AI assessments per month",
          "AI coaching — scores, rationale & tips",
          "Vocal statistics & transcript highlights",
          "Comparative coaching across sessions",
          "3 rehearsal sessions per month (5 takes each)",
          "Curated articles, TED Talks & podcasts",
          "Performance over time — line chart + dimension trends",
          "Auto-generated insights from your session history",
          "Post-session email summary with AI insights",
        ],
        cta: "START 7-DAY FREE TRIAL →",
        note: "No charge until your trial ends",
      },
      pro: {
        badge: "COMING SOON",
        label: "Pro",
        perMo: "/mo",
        footnote: "Premium plan · launching soon",
        features: [
          "Everything in Lite",
          "Unlimited AI assessments",
          "Unlimited rehearsal sessions & takes",
          "Industry leaderboard access",
          "Industry normative benchmarking",
          "Premium curated content library",
          "BBC Maestro, Harvard & more",
          "Individualised learning pathways",
          "Personal development dashboard",
          "Priority support",
        ],
        emailPlaceholder: "Your email address",
        saving: "Saving…",
        notifyCta: "NOTIFY ME WHEN PRO LAUNCHES →",
        submittedTitle: "You're on the list!",
        submittedBody: "We'll email you the moment Pro launches.",
      },
      teamLine: "Planning for a team or organisation?",
      teamCta: "Get in touch →",
    },
    finalCta: {
      eyebrow: "Get Started Today",
      h2Light: "EVERY GREAT PRESENTER",
      h2Bold: "STARTED SOMEWHERE",
      cta: "CREATE YOUR FREE ACCOUNT →",
      footnote: "2 free sessions · No credit card · Cancel anytime",
    },
    footer: {
      contact: "Contact",
      navigation: "Navigation",
      navItems: ["Product", "How It Works", "Pricing", "Why LearnFast"],
      followUs: "Follow Us",
      startNow: "START FREE NOW",
      copyright: (year) => `© ${year} LearnFast™. AI-Powered Presentation Intelligence.`,
      privacy: "Privacy Policy",
      terms: "Terms & Conditions",
      security: "Security",
      dpa: "DPA",
    },
  },
  fr: {
    nav: {
      product: "PRODUIT",
      howItWorks: "COMMENT ÇA MARCHE",
      pricing: "TARIFS",
      why: "POURQUOI",
      signIn: "Se connecter",
      freeAiAssessment: "ÉVALUATION IA GRATUITE",
      startFree: "COMMENCER →",
    },
    hero: {
      eyebrow: "L'intelligence de présentation par IA",
      personal: "Personnel",
      business: "Entreprise",
      italic: "ne quittez plus jamais une réunion en vous demandant si votre message est passé",
      h1: "L'APPLICATION LEARNFAST",
      body: "La seule plateforme qui combine analyse IA, retours du public en direct et auto-évaluation en une seule intelligence de coaching — notée selon les cinq dimensions d'une grande prise de parole.",
      footnote: "Aucun téléchargement requis · fonctionne sur tout appareil · disponible en anglais et en français.",
      cta1: "COMMENCER GRATUITEMENT — 2 SÉANCES OFFERTES",
      cta2: "ESSAYER GRATUITEMENT — SANS COMPTE →",
    },
    tagline: "Vos idées ne valent que par la manière dont vous les présentez",
    threeSignal: {
      eyebrow: "Méthodologie exclusive",
      h2Light: "LE MODÈLE",
      h2Bold: "À TROIS SIGNAUX D'INTELLIGENCE",
      sub: "La plupart des outils de feedback ne donnent qu'un seul point de vue. LearnFast vous en donne trois — simultanément. C'est dans leurs écarts que se trouve votre marge de progression.",
      signals: [
        { label: "IA", title: "L'Enregistrement", body: "Téléchargez votre enregistrement et une IA vous note selon les cinq dimensions. Statistiques vocales, citations exactes de votre transcription et conseils d'amélioration précis — livrés en quelques minutes." },
        { label: "Public", title: "La Salle", body: "Votre public vous note en temps réel via un QR code. Totalement anonyme. Ce qu'ils ont vraiment ressenti — pas ce qu'ils ont dit par politesse." },
        { label: "Vous", title: "Votre Perception", body: "Comment PENSEZ-vous que ça s'est passé ? Votre auto-évaluation, comparée aux scores de l'IA et du public, révèle si votre boussole interne est bien calibrée — ou non." },
      ],
      quote: "L'écart entre la façon dont vous pensez avoir performé et la façon dont votre public vous a réellement perçu est la donnée la plus importante de votre développement en tant qu'orateur.",
    },
    features: {
      eyebrow: "Tout ce dont vous avez besoin",
      h2Light: "CONÇU POUR",
      h2Bold: "LES ORATEURS SÉRIEUX",
      items: [
        { title: "Évaluation IA", body: "Téléchargez votre enregistrement et recevez un coaching noté par IA sur les cinq dimensions en 1 à 3 minutes. Statistiques vocales, citations marquantes, conseils d'amélioration et justification écrite complète — le tout à partir d'un seul fichier." },
        { title: "Mode Répétition", body: "Entraînez-vous prise par prise avec un coaching IA façon Richard Greene entre chaque tentative. Suggestions d'amélioration de script, suivi des scores prise par prise et sauvegarde de votre meilleure prise — conçu pour une préparation sérieuse." },
        { title: "Intelligence à Trois Signaux", body: "Combinez scores IA, retours du public en direct et votre propre auto-évaluation sur un seul radar. C'est précisément là où les trois signaux divergent que se trouve votre marge de progression." },
        { title: "Coaching Comparatif", body: "Votre feedback IA évolue à chaque séance. Chaque nouvelle évaluation s'appuie sur tout votre historique — en notant vos progrès, en identifiant les tendances persistantes et en adaptant ses conseils à votre trajectoire." },
        { title: "Classements par Secteur", body: "Découvrez votre classement face à vos pairs du secteur. Classements par dimension — Clarté, Énergie, Connexion et plus — mis à jour à chaque évaluation IA que vous complétez." },
        { title: "Ressources Adaptées à Vos Dimensions", body: "En fonction de VOS scores, LearnFast vous propose les articles, conférences TED, vidéos et podcasts les plus pertinents — adaptés précisément à vos axes de progression, pas une bibliothèque générique." },
        { title: "Réseau de Coachs Exécutifs", body: "Réservez une séance individuelle avec un coach en communication certifié, filtré par spécialité — présence exécutive, coaching de pitch, storytelling, communication de données et plus. Vos scores LearnFast leur indiquent précisément où concentrer leurs efforts." },
      ],
    },
    howItWorks: {
      eyebrow: "Simple par conception",
      h2Light: "COMMENT ÇA",
      h2Bold: "MARCHE",
      steps: [
        { title: "Créez une Séance", body: "Nommez votre séance et obtenez un QR code unique et un lien de participation en quelques secondes." },
        { title: "Partagez avec Votre Public", body: "Affichez le QR code ou partagez le lien. Aucun téléchargement, aucun compte requis pour votre public." },
        { title: "Recueillez des Retours en Direct", body: "Observez les scores arriver en temps réel sur les 5 dimensions au fur et à mesure que votre public répond." },
        { title: "Réfléchissez, Suivez et Progressez", body: "Auto-évaluez-vous, ajoutez une évaluation IA de votre enregistrement, et laissez LearnFast vous proposer les ressources exactes pour combler vos lacunes." },
      ],
    },
    aiSpotlight: {
      label: "Évaluation IA",
      h2Light: "VOTRE ENREGISTREMENT.",
      h2Bold: "VOTRE COACHING. EN QUELQUES MINUTES.",
      body: "Téléchargez n'importe quel enregistrement d'une réunion, d'une intervention ou d'une séance d'entraînement. Notre IA transcrit l'audio, note votre prestation sur les cinq dimensions et génère un rapport de coaching détaillé — avec citations exactes de votre transcription, statistiques vocales et conseils d'amélioration ciblés.",
      items: [
        { title: "Statistiques vocales", body: "Mots par minute, nombre de mots de remplissage, durée de parole et analyse du sentiment." },
        { title: "Extraits marquants", body: "Citations exactes de votre séance identifiées comme points forts ou axes de progression." },
        { title: "Justification par dimension", body: "Une explication écrite de chaque score — pas seulement un chiffre, mais le raisonnement derrière." },
        { title: "Conseils de coaching", body: "Des conseils ciblés et concrets pour vos trois dimensions les moins bien notées." },
        { title: "Feedback comparatif", body: "Chaque évaluation s'appuie sur votre historique — en notant progrès, régressions et tendances persistantes." },
        { title: "Contexte sectoriel", body: "Votre coaching est adapté à votre secteur professionnel pour des conseils pertinents et contextualisés." },
      ],
      cta: "COMMENCER GRATUITEMENT",
      footnote: "3 évaluations IA par mois avec Lite · Illimité avec Pro",
    },
    rehearsalSpotlight: {
      label: "Mode Répétition",
      h2Light: "ENTRAÎNEZ-VOUS. SOYEZ COACHÉ.",
      h2Bold: "PROGRESSEZ. RECOMMENCEZ.",
      body: "Le Mode Répétition transforme LearnFast en votre studio de préparation personnel. Enregistrez ou téléchargez une prise, recevez un coaching IA précis sur vos dimensions les plus faibles, puis recommencez — avec des indications précises sur ce qu'il faut améliorer. Prise après prise, vous progressez.",
      items: [
        { title: "Progression prise par prise", body: "Chaque prise est notée et comparée directement à la précédente. Observez vos scores évoluer en temps réel à mesure que votre prestation s'affine." },
        { title: "Coaching entre chaque prise", body: "Pas de conseils génériques — des indications précises et exigeantes. Le type de feedback que vous obtiendriez d'un coach de présentation de classe mondiale." },
        { title: "Suggestions d'amélioration de script", body: "Demandez une réécriture IA de votre script ciblant vos dimensions les moins bien notées. Votre voix reste intacte — vos mots deviennent plus percutants." },
        { title: "Sauvegardez votre meilleure prise", body: "Une fois votre meilleure prise atteinte, sauvegardez-la dans votre historique d'évaluations et continuez à suivre votre progression sur le long terme." },
      ],
      cta: "COMMENCER À RÉPÉTER GRATUITEMENT →",
      footnote: "1 séance gratuite · 3 séances/mois avec Lite · Illimité avec Pro",
    },
    leaderboards: {
      label: "Fonctionnalité Premium",
      h2Light: "CLASSEMENTS",
      h2Bold: "PAR SECTEUR",
      body: "Découvrez votre classement face à vos pairs du secteur. LearnFast construit de véritables données normatives à partir de chaque évaluation IA réalisée sur la plateforme — votre score n'est donc pas qu'un chiffre, c'est un rang percentile face aux professionnels de la vente, aux dirigeants de la santé, aux ingénieurs technologiques et plus encore.",
      bullets: [
        "Classement par dimension — Global, Clarté, Énergie, Engagement, Compréhension, Connexion",
        "Position en percentile face aux professionnels de votre secteur",
        "Anonyme par défaut — apparaissez sous un pseudonyme de votre choix",
        "Mis à jour à chaque évaluation IA que vous complétez",
        "Les référentiels sectoriels s'enrichissent à chaque nouvel utilisateur",
      ],
      cta: "COMMENCER →",
      mockupCategory: "Vente & Développement Commercial",
      mockupNickname: "Pseudo",
      mockupScore: "Score",
      mockupPercentile: "%ile",
      mockupYou: "Vous",
      mockupCaption: "Basé sur l'évaluation IA la plus récente · dimension Connexion",
    },
    dimensionsSection: {
      eyebrow: "Noté selon",
      h2Light: "LES",
      h2Bold: "5 DIMENSIONS",
      body: "Chaque signal — IA, public et auto-évaluation — vous note selon les cinq mêmes dimensions. Un seul cadre. Trois perspectives. Une vision complète.",
      dimensions: [
        { name: "Clarté", desc: "La clarté avec laquelle votre message et votre structure sont passés auprès de la salle." },
        { name: "Énergie", desc: "La présence, l'élocution et l'énergie que vous avez apportées à la salle." },
        { name: "Engagement", desc: "Votre capacité à capter l'attention et à maintenir l'implication du public tout au long de la présentation." },
        { name: "Compréhension", desc: "La mesure dans laquelle le public a saisi les idées essentielles que vous avez partagées." },
        { name: "Connexion", desc: "Le degré de connexion personnelle ressenti par le public envers vous et votre contenu." },
      ],
      footerCard: "IA + Public + Auto-évaluation, réunis sur un seul radar. Les écarts entre les signaux révèlent vos angles morts et vos forces cachées.",
    },
    freeCta: {
      eyebrow: "Aucun compte requis",
      h2Light: "DÉCOUVREZ EXACTEMENT",
      h2Bold: "COMMENT VOUS ÊTES NOTÉ",
      body1: "Enregistrez ou téléchargez 90 secondes d'une intervention, d'une réunion ou d'une présentation. Notre IA vous livre un rapport de coaching complet sur les cinq dimensions — gratuit, instantané, sans inscription.",
      body2: "La même IA qui alimente la plateforme LearnFast complète. Aucune version simplifiée.",
      cards: [
        { title: "Votre archétype de communicant", body: "L'un des six profils fondés sur des données probantes qui définit votre style de prestation et votre principal levier de progression." },
        { title: "Des scores sur les 5 dimensions", body: "Clarté, Énergie, Engagement, Compréhension et Connexion — chacune notée selon des normes professionnelles de prise de parole." },
        { title: "Un rapport de coaching IA complet", body: "Une justification précise pour chaque score, vos meilleurs moments extraits de la transcription, et des conseils ciblés pour votre dimension la plus faible." },
      ],
      cta: "OBTENIR MON SCORE IA GRATUIT →",
      footnote: "90 secondes · résultats instantanés · sans carte bancaire",
    },
    pricing: {
      eyebrow: "Tarifs",
      h2Light: "COMMENCEZ GRATUITEMENT,",
      h2Bold: "ÉVOLUEZ QUAND VOUS ÊTES PRÊT",
      free: {
        label: "Gratuit",
        footnote: "Aucune carte bancaire requise",
        features: [
          "2 séances de feedback",
          "Les 5 dimensions notées",
          "Radar du public en temps réel",
          "Scores d'auto-évaluation de l'orateur",
          "Vue comparative à trois signaux",
          "Notes et tags de séance",
          "Journal de pratique réflexive",
          "1 séance de répétition (3 prises)",
        ],
        cta: "COMMENCER GRATUITEMENT →",
      },
      lite: {
        badge: "LE PLUS POPULAIRE",
        label: "Lite",
        perMo: "/mois",
        footnote: "Essai gratuit de 7 jours · annulez à tout moment",
        features: [
          "Séances illimitées",
          "Tout ce qui est inclus dans Gratuit",
          "3 évaluations IA par mois",
          "Coaching IA — scores, justifications et conseils",
          "Statistiques vocales et extraits marquants",
          "Coaching comparatif entre les séances",
          "3 séances de répétition par mois (5 prises chacune)",
          "Articles, conférences TED et podcasts sélectionnés",
          "Performance dans le temps — graphique en courbes et tendances par dimension",
          "Analyses générées automatiquement à partir de votre historique",
          "Résumé par e-mail après chaque séance avec analyses IA",
        ],
        cta: "COMMENCER L'ESSAI GRATUIT DE 7 JOURS →",
        note: "Aucun prélèvement avant la fin de votre essai",
      },
      pro: {
        badge: "BIENTÔT DISPONIBLE",
        label: "Pro",
        perMo: "/mois",
        footnote: "Offre premium · lancement prochain",
        features: [
          "Tout ce qui est inclus dans Lite",
          "Évaluations IA illimitées",
          "Séances et prises de répétition illimitées",
          "Accès aux classements sectoriels",
          "Analyse comparative sectorielle",
          "Bibliothèque de contenu premium sélectionné",
          "BBC Maestro, Harvard et plus",
          "Parcours d'apprentissage individualisés",
          "Tableau de bord de développement personnel",
          "Support prioritaire",
        ],
        emailPlaceholder: "Votre adresse e-mail",
        saving: "Enregistrement…",
        notifyCta: "M'AVERTIR AU LANCEMENT DE PRO →",
        submittedTitle: "Vous êtes sur la liste !",
        submittedBody: "Nous vous enverrons un e-mail dès le lancement de Pro.",
      },
      teamLine: "Vous planifiez pour une équipe ou une organisation ?",
      teamCta: "Contactez-nous →",
    },
    finalCta: {
      eyebrow: "Commencez dès aujourd'hui",
      h2Light: "TOUT GRAND ORATEUR",
      h2Bold: "A COMMENCÉ QUELQUE PART",
      cta: "CRÉER VOTRE COMPTE GRATUIT →",
      footnote: "2 séances gratuites · Sans carte bancaire · Annulez à tout moment",
    },
    footer: {
      contact: "Contact",
      navigation: "Navigation",
      navItems: ["Produit", "Comment ça marche", "Tarifs", "Pourquoi LearnFast"],
      followUs: "Suivez-nous",
      startNow: "COMMENCER GRATUITEMENT",
      copyright: (year) => `© ${year} LearnFast™. L'intelligence de présentation par IA.`,
      privacy: "Politique de confidentialité",
      terms: "Conditions générales",
      security: "Sécurité",
      dpa: "DPA",
    },
  },
};
