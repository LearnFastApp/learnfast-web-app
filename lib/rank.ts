export const DIMS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
export type Dim = typeof DIMS[number];

export const DIM_COLOURS: Record<Dim, string> = {
  clarity:       "#8b5cf6",
  energy:        "#f59e0b",
  engagement:    "#22d3ee",
  understanding: "#34d399",
  connection:    "#f472b6",
};

export const DIM_SHORT: Record<Dim, string> = {
  clarity:       "CL",
  energy:        "EN",
  engagement:    "EG",
  understanding: "UN",
  connection:    "CO",
};

export const DIM_LABELS: Record<Dim, { en: string; fr: string }> = {
  clarity:       { en: "Clarity",       fr: "Clarté"         },
  energy:        { en: "Energy",        fr: "Énergie"        },
  engagement:    { en: "Engagement",    fr: "Engagement"     },
  understanding: { en: "Understanding", fr: "Compréhension"  },
  connection:    { en: "Connection",    fr: "Connexion"      },
};

export const DIM_DESC: Record<Dim, { en: string; fr: string }> = {
  clarity:       { en: "How clearly your message and structure land.",        fr: "La clarté de votre message et de votre structure."         },
  energy:        { en: "The presence and vocal dynamism you bring.",          fr: "La présence et le dynamisme vocal que vous apportez."      },
  engagement:    { en: "How well you hold attention and keep interest.",      fr: "Votre capacité à capter et maintenir l'attention."         },
  understanding: { en: "How well your audience grasps your core ideas.",     fr: "La façon dont votre audience saisit vos idées clés."       },
  connection:    { en: "The personal bond your audience feels with you.",    fr: "Le lien personnel que votre audience ressent avec vous."   },
};

export type RankName = "Spark" | "Signal" | "Resonance" | "Influence" | "Mastery";

export interface RankInfo {
  name: RankName;
  level: 1 | 2 | 3 | 4 | 5;
  colour: string;
  nextAt: string;
}

const RANK_DEFS: RankInfo[] = [
  { name: "Mastery",   level: 5, colour: "#f472b6", nextAt: "—"                        },
  { name: "Influence", level: 4, colour: "#f59e0b", nextAt: "40 sessions · 85+ avg"   },
  { name: "Resonance", level: 3, colour: "#8b5cf6", nextAt: "20 sessions · 75+ avg"   },
  { name: "Signal",    level: 2, colour: "#22d3ee", nextAt: "10 sessions · 65+ avg"   },
  { name: "Spark",     level: 1, colour: "#94a3b8", nextAt: "5 sessions · 50+ avg"    },
];

export function calculateRank(sessionCount: number, avgScore: number): RankInfo {
  if (sessionCount >= 40 && avgScore >= 85) return RANK_DEFS[0];
  if (sessionCount >= 20 && avgScore >= 75) return RANK_DEFS[1];
  if (sessionCount >= 10 && avgScore >= 65) return RANK_DEFS[2];
  if (sessionCount >= 5  && avgScore >= 50) return RANK_DEFS[3];
  return RANK_DEFS[4];
}

export function topDimension(scores: Record<string, number>): Dim {
  let best: Dim = "clarity";
  let bestScore = -1;
  for (const d of DIMS) {
    if ((scores[d] ?? 0) > bestScore) {
      bestScore = scores[d] ?? 0;
      best = d;
    }
  }
  return best;
}
