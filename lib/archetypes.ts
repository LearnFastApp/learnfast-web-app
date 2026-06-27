export type ArchetypeKey =
  | "expert"
  | "natural"
  | "technician"
  | "imposter"
  | "blind_spot"
  | "developer";

export interface ArchetypeDefinition {
  key: ArchetypeKey;
  emoji: string;
  color: string;
  borderClass: string;
  bgClass: string;
  name: Record<"en" | "fr", string>;
  tagline: Record<"en" | "fr", string>;
  description: Record<"en" | "fr", string>;
  strength: Record<"en" | "fr", string>;
  development: Record<"en" | "fr", string>;
}

const DIMS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
const DELIVERY_DIMS = ["energy", "connection", "engagement"] as const;
const STRUCTURE_DIMS = ["clarity", "understanding"] as const;

function mean(scores: Record<string, number>, dims: readonly string[] = DIMS): number {
  return dims.reduce((acc, d) => acc + (scores[d] ?? 0), 0) / dims.length;
}

export const ARCHETYPE_DEFS: Record<ArchetypeKey, ArchetypeDefinition> = {
  expert: {
    key: "expert",
    emoji: "🎯",
    color: "#a78bfa",
    borderClass: "border-violet-500/40",
    bgClass: "bg-violet-500/[0.07]",
    name: { en: "The Expert", fr: "L'Expert" },
    tagline: { en: "Authoritative · Consistent · Credible", fr: "Autoritaire · Cohérent · Crédible" },
    description: {
      en: "You present with authority and consistency across every dimension. Your audience experiences you as credible, clear and engaging — and your scores back it up. You're operating at a high level; the work now is mastering the subtleties that separate good from exceptional.",
      fr: "Vous présentez avec autorité et cohérence sur toutes les dimensions. Votre auditoire vous perçoit comme crédible, clair et engageant — et vos scores le confirment. Vous opérez à un niveau élevé ; le travail maintenant consiste à maîtriser les subtilités qui distinguent le bon de l'exceptionnel.",
    },
    strength: { en: "Consistent performance across all five dimensions", fr: "Performance constante sur les cinq dimensions" },
    development: { en: "The details that elevate strong delivery to exceptional", fr: "Les détails qui font passer une bonne prestation à l'exceptionnel" },
  },
  natural: {
    key: "natural",
    emoji: "✨",
    color: "#f59e0b",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/[0.07]",
    name: { en: "The Natural", fr: "Le Naturel" },
    tagline: { en: "Charismatic · Energetic · Authentic", fr: "Charismatique · Énergique · Authentique" },
    description: {
      en: "You have a rare gift for connecting with a room. People leave your sessions feeling energised and genuinely engaged. Your delivery instincts are strong — the opportunity is to add structural rigour and content clarity to amplify the natural charisma you already have.",
      fr: "Vous avez le don rare de créer un lien avec votre auditoire. Les gens quittent vos sessions dynamisés et réellement engagés. Votre instinct de prestation est solide — l'opportunité est d'ajouter de la rigueur structurelle et de la clarté pour amplifier le charisme naturel que vous possédez déjà.",
    },
    strength: { en: "Energy, connection and audience engagement", fr: "Énergie, connexion et engagement du public" },
    development: { en: "Building stronger logical structure and content clarity", fr: "Construire une structure logique plus solide et une clarté du contenu" },
  },
  technician: {
    key: "technician",
    emoji: "⚙️",
    color: "#22d3ee",
    borderClass: "border-cyan-500/40",
    bgClass: "bg-cyan-500/[0.07]",
    name: { en: "The Technician", fr: "Le Technicien" },
    tagline: { en: "Structured · Clear · Content-driven", fr: "Structuré · Clair · Axé sur le contenu" },
    description: {
      en: "Your content is excellent and your audience always understands the core message. You present with clear structure and genuine expertise. The gap is in delivery — adding vocal variety, energy and personal warmth will transform how your expertise lands in the room.",
      fr: "Votre contenu est excellent et votre auditoire comprend toujours le message central. Vous présentez avec une structure claire et une expertise authentique. L'écart se situe dans la prestation — ajouter de la variété vocale, de l'énergie et de la chaleur personnelle transformera l'impact de votre expertise.",
    },
    strength: { en: "Content clarity, structure and understanding transfer", fr: "Clarté du contenu, structure et transfert de compréhension" },
    development: { en: "Delivery energy, vocal dynamism and personal connection", fr: "Énergie de prestation, dynamisme vocal et connexion personnelle" },
  },
  imposter: {
    key: "imposter",
    emoji: "🦋",
    color: "#34d399",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/[0.07]",
    name: { en: "The Imposter", fr: "L'Imposteur" },
    tagline: { en: "Underestimated · Capable · Self-critical", fr: "Sous-estimé · Capable · Autocritique" },
    description: {
      en: "Your self-assessment is significantly harder on yourself than your actual performance warrants. Both the AI and your audience score you higher than you score yourself. You're performing at a genuinely strong level — the real work is learning to trust your delivery and close the gap between how you feel and how you actually land.",
      fr: "Votre auto-évaluation est bien plus sévère que vos performances réelles ne le justifient. L'IA et votre public vous notent plus haut que vous ne vous notez vous-même. Vous performez à un niveau réellement solide — le vrai travail est d'apprendre à faire confiance à votre prestation et à combler l'écart entre ce que vous ressentez et la réalité.",
    },
    strength: { en: "Performing at a higher level than you realise", fr: "Performer à un niveau plus élevé que vous ne le réalisez" },
    development: { en: "Building confidence in your delivery and calibrating self-assessment", fr: "Renforcer la confiance en votre prestation et calibrer l'auto-évaluation" },
  },
  blind_spot: {
    key: "blind_spot",
    emoji: "🪞",
    color: "#f472b6",
    borderClass: "border-pink-500/40",
    bgClass: "bg-pink-500/[0.07]",
    name: { en: "The Blind Spot", fr: "L'Angle Mort" },
    tagline: { en: "Confident · Intuitive · Gap to close", fr: "Confiant · Intuitif · Écart à combler" },
    description: {
      en: "There's a meaningful gap between how you experience your presentations and how your audience actually receives them. You rate yourself significantly higher than your AI and audience scores suggest. This is the most valuable data point you can have — it shows you precisely where focused development will have the biggest impact.",
      fr: "Il existe un écart significatif entre la façon dont vous vivez vos présentations et la façon dont votre public les reçoit réellement. Vous vous notez bien plus haut que vos scores IA et public ne le suggèrent. C'est la donnée la plus précieuse que vous puissiez avoir — elle vous montre précisément où le développement ciblé aura le plus grand impact.",
    },
    strength: { en: "High confidence and strong intuition about your own style", fr: "Grande confiance et forte intuition sur votre propre style" },
    development: { en: "Calibrating self-perception against audience and AI feedback", fr: "Calibrer la perception de soi par rapport aux retours du public et de l'IA" },
  },
  developer: {
    key: "developer",
    emoji: "🌱",
    color: "#a3e635",
    borderClass: "border-lime-500/40",
    bgClass: "bg-lime-500/[0.06]",
    name: { en: "The Developer", fr: "Le Développeur" },
    tagline: { en: "Building · Growing · Data-driven", fr: "En construction · En croissance · Orienté données" },
    description: {
      en: "You're at the beginning of a deliberate development curve. Your scores reveal clear priorities and the data will compound quickly from here — users in this archetype typically see the fastest score improvements across their first five sessions. Every assessment is a data point and every session is a chance to move the needle.",
      fr: "Vous êtes au début d'une courbe de développement délibérée. Vos scores révèlent des priorités claires et les données s'accumuleront rapidement — les utilisateurs dans ce profil voient généralement les améliorations de scores les plus rapides lors de leurs cinq premières sessions. Chaque évaluation est une donnée et chaque session est une opportunité de progresser.",
    },
    strength: { en: "Clear development priorities and data to act on immediately", fr: "Priorités de développement claires et données pour agir immédiatement" },
    development: { en: "Consistent practice and tracking progress across sessions", fr: "Pratique régulière et suivi des progrès entre les sessions" },
  },
};

/**
 * Classify a presenter into one of six archetypes based on their signal data.
 * Uses AI scores always; Imposter/Blind Spot require self-reflection scores.
 *
 * Order of precedence:
 *   1. Imposter (self underestimates vs AI by >14 pts)
 *   2. Blind Spot (self overestimates vs AI by >14 pts)
 *   3. Expert (overall AI ≥76, no dimension <60)
 *   4. Natural (delivery dims dominate structure dims by ≥11 pts)
 *   5. Technician (structure dims dominate delivery dims by ≥11 pts)
 *   6. Developer (default)
 */
export function classifyArchetype(
  aiScores: Record<string, number>,
  selfScores?: Record<string, number> | null,
): ArchetypeKey {
  const aiAvg = mean(aiScores);

  if (selfScores) {
    const selfAvg = mean(selfScores);
    if (aiAvg - selfAvg > 14) return "imposter";
    if (selfAvg - aiAvg > 14) return "blind_spot";
  }

  const minDim = Math.min(...DIMS.map((d) => aiScores[d] ?? 0));
  if (aiAvg >= 76 && minDim >= 60) return "expert";

  const deliveryAvg = mean(aiScores, DELIVERY_DIMS);
  const structureAvg = mean(aiScores, STRUCTURE_DIMS);

  if (deliveryAvg - structureAvg >= 11) return "natural";
  if (structureAvg - deliveryAvg >= 11) return "technician";

  return "developer";
}
