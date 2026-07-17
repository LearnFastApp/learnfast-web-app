// Bilingual copy for the Enterprise landing page (components/enterprise-page.tsx).
// Structural data (colors, icons, prices, testimonial quotes/names) stays in the
// page component — translatable text lives here, in the same order as the
// structural arrays it pairs with.
//
// Note: testimonial QUOTES are deliberately left untranslated (kept in the
// structural array, not here) — they're real, attributed words from named
// people, and machine-translating someone's actual quote without their sign-off
// misrepresents what they said. Only the role/title caption is localized.

export type EnterpriseLocale = "en" | "fr";

interface TitleBody { title: string; body: string; }
interface DimensionText { name: string; desc: string; }
interface ComparisonRowText { feature: string; learnfastLabel: string; competitorLabel: string; }

export interface EnterpriseCopy {
  nav: { signIn: string; getStarted: string };
  hero: {
    eyebrow: string;
    personal: string;
    business: string;
    h1Part1: string;
    h1Highlight: string;
    body: string;
    cta1: string;
    cta2: string;
    badges: string[];
  };
  problemBand: {
    eyebrow: string;
    items: { quote: string; fix: string }[];
  };
  howItWorks: {
    h2: string;
    sub: string;
    steps: { title: string; time: string; body: string }[];
  };
  stats: { stat: string; label: string }[];
  testimonials: {
    h2: string;
    sub: string;
    roles: string[];
  };
  features: {
    h2: string;
    sub: string;
    items: TitleBody[];
  };
  pricing: {
    h2: string;
    perSeatMo: string;
    fiveSeatMin: string;
    perSeatMoAnnual: string;
    save20: string;
    tableFeature: string;
    tableLearnfast: string;
    comparisonRows: ComparisonRowText[];
  };
  dimensionsSection: {
    h2: string;
    sub: string;
    dimensions: DimensionText[];
  };
  cta: {
    eyebrow: string;
    h2: string;
    body: string;
    cta1: string;
    cta2: string;
    footnote: string;
  };
  footer: {
    privacy: string;
    terms: string;
    security: string;
    dpa: string;
  };
}

export const ENTERPRISE_COPY: Record<EnterpriseLocale, EnterpriseCopy> = {
  en: {
    nav: { signIn: "Sign in", getStarted: "Get started" },
    hero: {
      eyebrow: "Presentation & Communication Skills — For Your Whole Team",
      personal: "Personal",
      business: "Business",
      h1Part1: "YOUR WHOLE TEAM. ",
      h1Highlight: "ONE FEEDBACK PLATFORM.",
      body: "Most L&D teams have no visibility into how their people communicate. Presenters walk out of the room and get nothing actionable — no scores, no trends, no way to know if they're improving. LearnFast fixes that. Live audience feedback, AI rehearsal coaching and measurable performance tracking for every presenter on your team — in one platform you control.",
      cta1: "Start a free trial",
      cta2: "See pricing ↓",
      badges: ["No sales call required", "5-seat minimum", "14-day free trial", "Cancel any time"],
    },
    problemBand: {
      eyebrow: "Sound familiar?",
      items: [
        { quote: "Our presenters get feedback after every session — it's just 'great job' and nothing measurable.", fix: "LearnFast replaces vague praise with real-time scores across five structured dimensions." },
        { quote: "We invest in coaching, but we have no way to tell if it's actually working.", fix: "Performance over time — line charts and trend data for every member, every session." },
        { quote: "I can't see how my team communicates without sitting in every meeting.", fix: "A manager dashboard that shows individual and team-wide patterns — without you being in the room." },
      ],
    },
    howItWorks: {
      h2: "How it works",
      sub: "Up and running in under five minutes. No IT team required.",
      steps: [
        { title: "Bring your team in", time: "2 minutes", body: "Create your organisation, upload your logo and invite your team. They join with their existing LearnFast account or sign up in seconds — no software to install, no IT ticketing." },
        { title: "Collect feedback at every session", time: "30 seconds per audience member", body: "Each session gets a QR code. The audience scans and rates in under a minute — no app, no login, no friction. Scores flow straight into each presenter's five-dimension profile." },
        { title: "Coach the whole team with data", time: "Ongoing", body: "Your dashboard shows individual trends and team-wide patterns side by side. Drill into any member's performance history, assign rehearsals, and watch scores move — session by session, person by person." },
      ],
    },
    stats: [
      { stat: "< 1 min", label: "for an audience member to submit feedback — no app, no login" },
      { stat: "5 dimensions", label: "every session scored across the same structured framework, every time" },
      { stat: "0 installs", label: "audience scans a QR code and rates — works on any phone" },
    ],
    testimonials: {
      h2: "Trusted by coaches we coach",
      sub: "Real coaches, real results — feedback that improves your delivery.",
      roles: ["Head of Athletic Performance, Sydney Swans", "Technical Director, UFC Performance Institute"],
    },
    features: {
      h2: "Everything in the platform",
      sub: "From the moment a presenter steps up to a year of tracked development — every tool they need is already here.",
      items: [
        { title: "Live Audience Feedback", body: "Every session gets a QR code. The audience scans and rates across all five dimensions in under a minute — no app, no login, no friction. Scores appear in real time as they arrive." },
        { title: "Team Analytics & Trends", body: "A team-wide radar and performance table showing every member's session count, feedback volume and dimension averages side by side. Spot who's improving and who needs support — at a glance." },
        { title: "Member Performance Drill-Down", body: "Click any team member to see their full session history, a performance-over-time line chart with dimension toggles, and first-to-last trend indicators. The same depth as individual analytics — for every person on your team." },
        { title: "AI Rehearsal Coaching", body: "Every member gets AI-powered rehearsal. Record a take, receive high-standard coaching on your weakest dimensions, then go again with precise direction. Take-by-take progression, script improvement suggestions, save-your-best-take flow." },
        { title: "Assignment System", body: "Coaches and admins can assign rehearsal tasks to specific members with due dates. Track completion from the analytics dashboard — pending, overdue and completed assignments in one view." },
        { title: "Team Coaching Feed", body: "Members share rehearsals to a private team feed. Coaches leave targeted feedback by dimension. A contribution rank system keeps the team accountable and engaged." },
        { title: "Resource Hub", body: "Every member gets access to a curated library of articles, TED Talks, videos and podcasts — filtered by the dimension they're working on. Content updates automatically as their scores evolve." },
        { title: "Executive Coach Roster", body: "Give your team access to vetted communication coaches, matched by specialism — executive presence, storytelling, pitch coaching, data communication and more. Org admins control roster access." },
        { title: "Organisation Branding", body: "Upload your logo and the platform automatically extracts your brand colour and applies it throughout — replacing the LearnFast wordmark with yours. Your platform, your identity." },
      ],
    },
    pricing: {
      h2: "Simple pricing. No contracts, no calls.",
      perSeatMo: "/ seat / month",
      fiveSeatMin: "5-seat minimum",
      perSeatMoAnnual: "/ seat / month, billed annually",
      save20: "Save 20%",
      tableFeature: "Feature",
      tableLearnfast: "LearnFast Enterprise",
      comparisonRows: [
        { feature: "Transparent pricing", learnfastLabel: "From £15/seat/mo", competitorLabel: "Call sales" },
        { feature: "Buy with a credit card", learnfastLabel: "Self-serve in < 5 min", competitorLabel: "Annual contracts" },
        { feature: "Live audience feedback loop", learnfastLabel: "QR → real-time scores", competitorLabel: "Practice sandbox only" },
        { feature: "AI + Audience + Self-reflection", learnfastLabel: "Three Signal Model", competitorLabel: "Delivery AI only" },
        { feature: "Individual performance tracking", learnfastLabel: "Drill-down + trend charts", competitorLabel: "" },
        { feature: "Manager dashboard", learnfastLabel: "", competitorLabel: "" },
        { feature: "Rehearsal & AI coaching", learnfastLabel: "", competitorLabel: "" },
        { feature: "Curated learning resources", learnfastLabel: "Dimension-matched", competitorLabel: "" },
        { feature: "Assignment tracking", learnfastLabel: "", competitorLabel: "" },
        { feature: "5-seat minimum", learnfastLabel: "", competitorLabel: "Larger minimums" },
        { feature: "No sales call needed", learnfastLabel: "", competitorLabel: "" },
      ],
    },
    dimensionsSection: {
      h2: "One framework. Five dimensions. Measurable progress.",
      sub: "Every score, every AI assessment, and every coaching note maps to the same five dimensions — so you can see exactly where each person is growing and where the team needs work.",
      dimensions: [
        { name: "Clarity", desc: "How clearly your message and structure comes across to the room." },
        { name: "Energy", desc: "The presence, vocal delivery and energy you bring to the room." },
        { name: "Engagement", desc: "How well you hold attention and keep the audience invested." },
        { name: "Understanding", desc: "How well the audience grasps the core ideas you share." },
        { name: "Connection", desc: "How personally connected the audience feels to you and your content." },
      ],
    },
    cta: {
      eyebrow: "The bottom line",
      h2: "Your ideas are only as good as how they're delivered.",
      body: "LearnFast gives every presenter on your team the feedback they need to close the gap — without the overhead of coaching programmes or the guesswork of self-assessment.",
      cta1: "Start free trial",
      cta2: "Book a call instead →",
      footnote: "14-day free trial · No card required · Cancel any time",
    },
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      security: "Security",
      dpa: "DPA",
    },
  },
  fr: {
    nav: { signIn: "Se connecter", getStarted: "Commencer" },
    hero: {
      eyebrow: "Compétences de présentation et de communication — pour toute votre équipe",
      personal: "Personnel",
      business: "Entreprise",
      h1Part1: "TOUTE VOTRE ÉQUIPE. ",
      h1Highlight: "UNE SEULE PLATEFORME DE FEEDBACK.",
      body: "La plupart des équipes L&D n'ont aucune visibilité sur la façon dont leurs collaborateurs communiquent. Les orateurs quittent la salle sans rien de concret — ni scores, ni tendances, aucun moyen de savoir s'ils progressent. LearnFast résout ce problème. Retours du public en direct, coaching IA de répétition et suivi mesurable de la performance pour chaque orateur de votre équipe — sur une seule plateforme que vous contrôlez.",
      cta1: "Démarrer un essai gratuit",
      cta2: "Voir les tarifs ↓",
      badges: ["Aucun appel commercial requis", "5 sièges minimum", "Essai gratuit de 14 jours", "Annulez à tout moment"],
    },
    problemBand: {
      eyebrow: "Ça vous parle ?",
      items: [
        { quote: "Nos orateurs reçoivent un retour après chaque séance — juste un « bon travail » sans rien de mesurable.", fix: "LearnFast remplace les compliments vagues par des scores en temps réel sur cinq dimensions structurées." },
        { quote: "Nous investissons dans le coaching, mais nous n'avons aucun moyen de savoir si ça fonctionne vraiment.", fix: "Performance dans le temps — graphiques en courbes et données de tendance pour chaque membre, à chaque séance." },
        { quote: "Je ne peux pas voir comment mon équipe communique sans assister à chaque réunion.", fix: "Un tableau de bord manager qui montre les tendances individuelles et collectives — sans que vous soyez dans la salle." },
      ],
    },
    howItWorks: {
      h2: "Comment ça marche",
      sub: "Opérationnel en moins de cinq minutes. Aucune équipe IT nécessaire.",
      steps: [
        { title: "Intégrez votre équipe", time: "2 minutes", body: "Créez votre organisation, téléchargez votre logo et invitez votre équipe. Ils rejoignent avec leur compte LearnFast existant ou s'inscrivent en quelques secondes — aucun logiciel à installer, aucun ticket IT." },
        { title: "Recueillez du feedback à chaque séance", time: "30 secondes par membre du public", body: "Chaque séance obtient un QR code. Le public scanne et note en moins d'une minute — aucune application, aucune connexion, aucune friction. Les scores alimentent directement le profil à cinq dimensions de chaque orateur." },
        { title: "Coachez toute l'équipe avec des données", time: "En continu", body: "Votre tableau de bord affiche côte à côte les tendances individuelles et collectives. Explorez l'historique de performance de chaque membre, assignez des répétitions, et observez les scores évoluer — séance par séance, personne par personne." },
      ],
    },
    stats: [
      { stat: "< 1 min", label: "pour qu'un membre du public soumette son feedback — aucune application, aucune connexion" },
      { stat: "5 dimensions", label: "chaque séance notée selon le même cadre structuré, à chaque fois" },
      { stat: "0 installation", label: "le public scanne un QR code et note — fonctionne sur tout téléphone" },
    ],
    testimonials: {
      h2: "Approuvé par les coachs que nous coachons",
      sub: "De vrais coachs, de vrais résultats — un feedback qui améliore votre prestation.",
      roles: ["Directeur de la performance athlétique, Sydney Swans", "Directeur technique, UFC Performance Institute"],
    },
    features: {
      h2: "Tout ce que contient la plateforme",
      sub: "Du moment où un orateur se lance jusqu'à une année de développement suivi — tous les outils dont il a besoin sont déjà là.",
      items: [
        { title: "Retours du Public en Direct", body: "Chaque séance obtient un QR code. Le public scanne et note sur les cinq dimensions en moins d'une minute — aucune application, aucune connexion, aucune friction. Les scores apparaissent en temps réel à mesure qu'ils arrivent." },
        { title: "Analytique et Tendances d'Équipe", body: "Un radar d'équipe et un tableau de performance affichant côte à côte le nombre de séances, le volume de feedback et les moyennes par dimension de chaque membre. Repérez en un coup d'œil qui progresse et qui a besoin de soutien." },
        { title: "Analyse Détaillée par Membre", body: "Cliquez sur n'importe quel membre de l'équipe pour voir son historique complet de séances, un graphique de performance dans le temps avec sélection par dimension, et des indicateurs de tendance du premier au dernier score. La même profondeur que l'analytique individuelle — pour chaque personne de votre équipe." },
        { title: "Coaching IA de Répétition", body: "Chaque membre bénéficie de répétitions propulsées par IA. Enregistrez une prise, recevez un coaching exigeant sur vos dimensions les plus faibles, puis recommencez avec des indications précises. Progression prise par prise, suggestions d'amélioration de script, sauvegarde de votre meilleure prise." },
        { title: "Système d'Attribution", body: "Les coachs et administrateurs peuvent attribuer des tâches de répétition à des membres spécifiques avec des échéances. Suivez leur achèvement depuis le tableau de bord analytique — tâches en attente, en retard et terminées en une seule vue." },
        { title: "Fil de Coaching d'Équipe", body: "Les membres partagent leurs répétitions sur un fil d'équipe privé. Les coachs laissent un feedback ciblé par dimension. Un système de classement par contribution maintient l'équipe responsable et engagée." },
        { title: "Centre de Ressources", body: "Chaque membre a accès à une bibliothèque sélectionnée d'articles, conférences TED, vidéos et podcasts — filtrée selon la dimension sur laquelle il travaille. Le contenu se met à jour automatiquement à mesure que ses scores évoluent." },
        { title: "Réseau de Coachs Exécutifs", body: "Donnez à votre équipe accès à des coachs en communication certifiés, sélectionnés par spécialité — présence exécutive, storytelling, coaching de pitch, communication de données et plus. Les administrateurs contrôlent l'accès au réseau." },
        { title: "Image de Marque de l'Organisation", body: "Téléchargez votre logo et la plateforme extrait automatiquement votre couleur de marque pour l'appliquer partout — remplaçant le logo LearnFast par le vôtre. Votre plateforme, votre identité." },
      ],
    },
    pricing: {
      h2: "Des tarifs simples. Sans contrat, sans appel.",
      perSeatMo: "/ siège / mois",
      fiveSeatMin: "5 sièges minimum",
      perSeatMoAnnual: "/ siège / mois, facturé annuellement",
      save20: "Économisez 20 %",
      tableFeature: "Fonctionnalité",
      tableLearnfast: "LearnFast Enterprise",
      comparisonRows: [
        { feature: "Tarification transparente", learnfastLabel: "À partir de 15£/siège/mois", competitorLabel: "Appeler les ventes" },
        { feature: "Achat par carte bancaire", learnfastLabel: "Autonome en < 5 min", competitorLabel: "Contrats annuels" },
        { feature: "Boucle de feedback du public en direct", learnfastLabel: "QR → scores en temps réel", competitorLabel: "Bac à sable d'entraînement uniquement" },
        { feature: "IA + Public + Auto-évaluation", learnfastLabel: "Modèle à trois signaux", competitorLabel: "IA de prestation uniquement" },
        { feature: "Suivi de performance individuelle", learnfastLabel: "Analyse détaillée + graphiques de tendance", competitorLabel: "" },
        { feature: "Tableau de bord manager", learnfastLabel: "", competitorLabel: "" },
        { feature: "Répétition et coaching IA", learnfastLabel: "", competitorLabel: "" },
        { feature: "Ressources d'apprentissage sélectionnées", learnfastLabel: "Adaptées par dimension", competitorLabel: "" },
        { feature: "Suivi des attributions", learnfastLabel: "", competitorLabel: "" },
        { feature: "5 sièges minimum", learnfastLabel: "", competitorLabel: "Minimums plus élevés" },
        { feature: "Aucun appel commercial nécessaire", learnfastLabel: "", competitorLabel: "" },
      ],
    },
    dimensionsSection: {
      h2: "Un seul cadre. Cinq dimensions. Une progression mesurable.",
      sub: "Chaque score, chaque évaluation IA et chaque note de coaching se rattache aux cinq mêmes dimensions — pour que vous puissiez voir exactement où chaque personne progresse et où l'équipe doit travailler.",
      dimensions: [
        { name: "Clarté", desc: "La clarté avec laquelle votre message et votre structure sont perçus par la salle." },
        { name: "Énergie", desc: "La présence, l'élocution et l'énergie que vous apportez à la salle." },
        { name: "Engagement", desc: "Votre capacité à capter l'attention et à maintenir l'implication du public." },
        { name: "Compréhension", desc: "La mesure dans laquelle le public saisit les idées essentielles que vous partagez." },
        { name: "Connexion", desc: "Le degré de connexion personnelle ressenti par le public envers vous et votre contenu." },
      ],
    },
    cta: {
      eyebrow: "L'essentiel",
      h2: "Vos idées ne valent que par la manière dont vous les présentez.",
      body: "LearnFast donne à chaque orateur de votre équipe le feedback dont il a besoin pour combler l'écart — sans la lourdeur des programmes de coaching ni les approximations de l'auto-évaluation.",
      cta1: "Démarrer l'essai gratuit",
      cta2: "Réserver un appel à la place →",
      footnote: "Essai gratuit de 14 jours · Aucune carte requise · Annulez à tout moment",
    },
    footer: {
      privacy: "Confidentialité",
      terms: "Conditions",
      security: "Sécurité",
      dpa: "DPA",
    },
  },
};
