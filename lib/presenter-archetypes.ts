import type { DimensionScores } from "./gap-analysis";

export interface PresenterArchetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
  primaryStrength: string;
  primaryDevelopment: string;
  coachingFocus: string;
  color: string; // tailwind color token for accent
  requiresAllSignals: boolean; // false = can be detected from AI alone
}

const ARCHETYPES: Record<string, PresenterArchetype> = {
  expert: {
    id: "expert",
    name: "The Expert",
    tagline: "Consistently strong across all three lenses",
    description:
      "Technical delivery, audience impact and self-awareness are aligned at a high level. You are performing at or near your ceiling — the next step is refinement, not reconstruction.",
    primaryStrength: "All three signals agree: you are a high-performing presenter.",
    primaryDevelopment: "Identify the 20% that separates your good sessions from your exceptional ones and systematise it.",
    coachingFocus:
      "Study your own best moments. What were you doing differently in sessions where all three signals converged above 80? That is your formula.",
    color: "amber",
    requiresAllSignals: false,
  },
  natural: {
    id: "natural",
    name: "The Natural",
    tagline: "Your charisma outperforms your technique",
    description:
      "Your audience scores are significantly higher than your AI scores. You connect, engage and inspire in the room — but your delivery has technical gaps that a recording exposes. This is a strength, not a problem: you have the hardest thing to teach.",
    primaryStrength: "Authentic stage presence and real audience connection.",
    primaryDevelopment:
      "Building technical consistency so that great sessions are not personality-dependent — and replicable when energy is lower.",
    coachingFocus:
      "Work on the basics: filler words, pacing, and deliberate story structure. Your instincts are already excellent. The technique will make them reliable.",
    color: "emerald",
    requiresAllSignals: true,
  },
  technician: {
    id: "technician",
    name: "The Technician",
    tagline: "Technically excellent but not fully landing",
    description:
      "Your AI scores are strong but your audience scores are lower. Your preparation, structure and vocal delivery are all working — but something is lost between the recording and the room. This often points to warmth, in-the-moment responsiveness, or content pitched above the audience level.",
    primaryStrength: "Structure, preparation, and technical delivery clarity.",
    primaryDevelopment:
      "Authenticity and adaptability in the room. Audiences need to feel you are speaking to them, not performing at them.",
    coachingFocus:
      "Before your next session, spend two minutes asking questions and genuinely listening. Then let what you heard change at least one thing in your opening. Adaptability creates connection.",
    color: "blue",
    requiresAllSignals: true,
  },
  imposter: {
    id: "imposter",
    name: "The Imposter",
    tagline: "Performing at a higher level than you believe",
    description:
      "Both AI and audience scores are high but your self-reflection scores are consistently lower. The evidence is clear: you are a strong presenter who does not yet trust that evidence. This gap is about self-belief, not skill.",
    primaryStrength: "Consistent high performance — both technically and in perceived impact.",
    primaryDevelopment:
      "Self-belief. The gap is in your internal narrative, not your external performance.",
    coachingFocus:
      "Keep this data. When the inner critic fires, open your results and read the audience scores. Then read them again. Trust what three independent signals are telling you.",
    color: "violet",
    requiresAllSignals: true,
  },
  overconfident: {
    id: "overconfident",
    name: "The Blind Spot",
    tagline: "Self-perception and reality are misaligned",
    description:
      "Your self-reflection scores are significantly higher than your AI and audience scores. This is the most important insight the three-signal model can give you — not a criticism, but an invitation. Self-awareness is the foundation all other development is built on.",
    primaryStrength:
      "Confidence and willingness to present — both are essential foundations that many people never develop.",
    primaryDevelopment:
      "Building self-awareness. The scores are data, not judgement. Use them to calibrate.",
    coachingFocus:
      "After each presentation, write down three specific moments and how you think they landed. Then look at your audience scores. Do they align? The more you practise this comparison, the faster self-awareness develops.",
    color: "rose",
    requiresAllSignals: true,
  },
  developer: {
    id: "developer",
    name: "The Developer",
    tagline: "Building strong foundations",
    description:
      "Scores are in the developing range — but you are using the right tool. Presenters who measure, reflect and seek feedback are the ones who improve fastest. You are already doing the hardest part.",
    primaryStrength: "Growth mindset. Using feedback to develop is a skill in itself, and you have it.",
    primaryDevelopment:
      "Identify the single dimension with the lowest score and give it focused attention for the next three sessions.",
    coachingFocus:
      "Pick one technique per session — not five. Sustainable improvement comes from mastering one thing at a time and moving to the next.",
    color: "cyan",
    requiresAllSignals: false,
  },
};

function dimensionAverage(scores: DimensionScores): number {
  const vals = Object.values(scores);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function detectArchetype(
  ai: DimensionScores,
  audience: DimensionScores | null,
  reflection: DimensionScores | null
): PresenterArchetype {
  const aiAvg = dimensionAverage(ai);
  const audienceAvg = audience ? dimensionAverage(audience) : null;
  const reflectionAvg = reflection ? dimensionAverage(reflection) : null;

  const HIGH = 68; // threshold for "high" signal
  const SIGNIFICANT_GAP = 15; // gap that triggers a meaningful archetype divergence

  if (audienceAvg !== null && reflectionAvg !== null) {
    const aiHigh = aiAvg >= HIGH;
    const audienceHigh = audienceAvg >= HIGH;
    const selfHigh = reflectionAvg >= HIGH;

    // All three high → Expert
    if (aiHigh && audienceHigh && selfHigh) return ARCHETYPES.expert;

    // AI high, Audience high, Self low → Imposter
    if (aiHigh && audienceHigh && !selfHigh) return ARCHETYPES.imposter;

    // AI significantly higher than Audience → Technician
    if (aiAvg - audienceAvg >= SIGNIFICANT_GAP) return ARCHETYPES.technician;

    // Audience significantly higher than AI → Natural
    if (audienceAvg - aiAvg >= SIGNIFICANT_GAP) return ARCHETYPES.natural;

    // Self significantly higher than both others → Blind Spot
    if (
      reflectionAvg - aiAvg >= SIGNIFICANT_GAP &&
      reflectionAvg - audienceAvg >= SIGNIFICANT_GAP
    ) return ARCHETYPES.overconfident;

    // All signals low with aligned self → Developer
    if (!aiHigh && !audienceHigh) return ARCHETYPES.developer;

    // Default with all three signals: Expert if high enough, else Developer
    return aiAvg >= HIGH ? ARCHETYPES.expert : ARCHETYPES.developer;
  }

  // Fallback with AI only
  if (aiAvg >= 78) return ARCHETYPES.expert;
  return ARCHETYPES.developer;
}

export { ARCHETYPES };
