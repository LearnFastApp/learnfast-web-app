const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const DIM_LABELS_FR: Record<Dimension, string> = {
  clarity: "clarté",
  engagement: "engagement",
  energy: "énergie",
  understanding: "compréhension",
  connection: "connexion",
};

function dimLabel(dim: Dimension, locale: "en" | "fr"): string {
  return locale === "fr" ? DIM_LABELS_FR[dim] : dim;
}

function dimCap(dim: Dimension, locale: "en" | "fr"): string {
  const l = dimLabel(dim, locale);
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export interface Insight {
  type: "day-pattern" | "correlation" | "anomaly" | "streak" | "best-session";
  severity: "positive" | "warning" | "neutral";
  title: string;
  description: string;
}

interface SessionData {
  id: string;
  title: string;
  createdAt: Date;
  averages: Record<Dimension, number>;
  responseCount: number;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (dx === 0 || dy === 0) return 0;
  return num / (dx * dy);
}

function overallScore(averages: Record<Dimension, number>): number {
  return mean(Object.values(averages));
}

export function generateInsights(sessions: SessionData[], locale: "en" | "fr" = "en"): Insight[] {
  const insights: Insight[] = [];
  if (sessions.length < 2) return insights;
  const isFr = locale === "fr";
  const DAYS = isFr ? DAYS_FR : DAYS_EN;

  const overallMean = mean(sessions.map((s) => overallScore(s.averages)));
  const overallSD = stdDev(sessions.map((s) => overallScore(s.averages)));

  // --- Day-of-week patterns ---
  if (sessions.length >= 3) {
    const byDay: Record<number, SessionData[]> = {};
    sessions.forEach((s) => {
      const d = s.createdAt.getDay();
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(s);
    });

    for (const [dayNum, daySessions] of Object.entries(byDay)) {
      if (daySessions.length < 2) continue;
      for (const dim of DIMENSIONS) {
        const dayAvg = mean(daySessions.map((s) => s.averages[dim]));
        const allAvg = mean(sessions.map((s) => s.averages[dim]));
        const diff = dayAvg - allAvg;
        const day = DAYS[Number(dayNum)];
        if (diff < -12) {
          insights.push({
            type: "day-pattern",
            severity: "warning",
            title: isFr
              ? `Baisse du ${day.toLowerCase()} en ${dimLabel(dim, locale)}`
              : `${day} dip in ${dim}`,
            description: isFr
              ? `Vos scores de ${dimLabel(dim, locale)} le ${day.toLowerCase()} sont en moyenne ${Math.abs(diff).toFixed(0)} points en dessous de la normale — réfléchissez à ce qui pourrait drainer l'énergie ces jours-là.`
              : `Your ${dim} scores on ${day}s average ${Math.abs(diff).toFixed(0)} points below your usual — consider what might be draining energy on those days.`,
          });
        } else if (diff > 12) {
          insights.push({
            type: "day-pattern",
            severity: "positive",
            title: isFr
              ? `Le ${day.toLowerCase()} est votre meilleur jour pour ${dimLabel(dim, locale)}`
              : `${day} is your best day for ${dim}`,
            description: isFr
              ? `${dimCap(dim, locale)} le ${day.toLowerCase()} est en moyenne ${diff.toFixed(0)} points au-dessus de la normale — vous êtes à votre meilleur ces jours-là.`
              : `${dimCap(dim, locale)} on ${day}s averages ${diff.toFixed(0)} points above your norm — you tend to be at your best then.`,
          });
        }
      }
    }
  }

  // --- Correlations ---
  if (sessions.length >= 4) {
    const checked = new Set<string>();
    for (const dimA of DIMENSIONS) {
      for (const dimB of DIMENSIONS) {
        if (dimA === dimB) continue;
        const key = [dimA, dimB].sort().join("-");
        if (checked.has(key)) continue;
        checked.add(key);

        const xs = sessions.map((s) => s.averages[dimA]);
        const ys = sessions.map((s) => s.averages[dimB]);
        const r = pearson(xs, ys);

        if (r >= 0.75) {
          insights.push({
            type: "correlation",
            severity: "neutral",
            title: isFr
              ? `${dimCap(dimA, locale)} & ${dimLabel(dimB, locale)} évoluent ensemble`
              : `${dimCap(dimA, locale)} & ${dimB} move together`,
            description: isFr
              ? `Quand votre ${dimLabel(dimA, locale)} est élevé(e), votre ${dimLabel(dimB, locale)} tend à l'être aussi (corrélation de ${Math.round(r * 100)}%). Améliorer l'un va probablement tirer l'autre vers le haut.`
              : `When your ${dimA} is high, your ${dimB} tends to be high too (${Math.round(r * 100)}% correlation). Improving one is likely to lift the other.`,
          });
        } else if (r <= -0.6) {
          insights.push({
            type: "correlation",
            severity: "neutral",
            title: isFr
              ? `Compromis entre ${dimLabel(dimA, locale)} et ${dimLabel(dimB, locale)}`
              : `${dimCap(dimA, locale)} vs ${dimB} trade-off`,
            description: isFr
              ? `Vos scores de ${dimLabel(dimA, locale)} et de ${dimLabel(dimB, locale)} ont tendance à évoluer en sens inverse. Cela vaut la peine d'explorer si se concentrer sur l'un se fait au détriment de l'autre.`
              : `Your ${dimA} and ${dimB} scores tend to move in opposite directions. Worth exploring whether focusing on one comes at the cost of the other.`,
          });
        }
      }
    }
  }

  // --- Streak detection (last 3 sessions) ---
  if (sessions.length >= 3) {
    const last3 = sessions.slice(-3);
    for (const dim of DIMENSIONS) {
      const vals = last3.map((s) => s.averages[dim]);
      if (vals[0] < vals[1] && vals[1] < vals[2]) {
        insights.push({
          type: "streak",
          severity: "positive",
          title: isFr
            ? `${dimCap(dim, locale)} est en hausse`
            : `${dimCap(dim, locale)} is on the rise`,
          description: isFr
            ? `Votre score de ${dimLabel(dim, locale)} s'est amélioré à chacune de vos 3 dernières sessions — de ${vals[0].toFixed(0)} à ${vals[1].toFixed(0)} à ${vals[2].toFixed(0)}. Continuez ainsi.`
            : `Your ${dim} score has improved in each of your last 3 sessions — from ${vals[0].toFixed(0)} to ${vals[1].toFixed(0)} to ${vals[2].toFixed(0)}. Keep it up.`,
        });
      } else if (vals[0] > vals[1] && vals[1] > vals[2]) {
        insights.push({
          type: "streak",
          severity: "warning",
          title: isFr
            ? `${dimCap(dim, locale)} en baisse sur les 3 dernières sessions`
            : `${dimCap(dim, locale)} dropping across last 3 sessions`,
          description: isFr
            ? `Votre ${dimLabel(dim, locale)} a baissé à chaque session récemment — ${vals[0].toFixed(0)}, ${vals[1].toFixed(0)}, ${vals[2].toFixed(0)}. Cela vaut peut-être la peine de revoir ce qui a changé.`
            : `Your ${dim} has dipped each session recently — ${vals[0].toFixed(0)}, ${vals[1].toFixed(0)}, ${vals[2].toFixed(0)}. It may be worth reviewing what's changed.`,
        });
      }
    }
  }

  // --- Anomaly: best/worst single session ---
  if (sessions.length >= 3 && overallSD > 0) {
    const scored = sessions.map((s) => ({ ...s, score: overallScore(s.averages) }));
    const best = scored.reduce((a, b) => b.score > a.score ? b : a);
    const worst = scored.reduce((a, b) => b.score < a.score ? b : a);

    if ((best.score - overallMean) / overallSD >= 1.2) {
      insights.push({
        type: "best-session",
        severity: "positive",
        title: isFr
          ? `Session remarquable : "${best.title}"`
          : `Standout session: "${best.title}"`,
        description: isFr
          ? `C'était votre session avec le meilleur score global (${best.score.toFixed(0)}/100) — ${((best.score - overallMean)).toFixed(0)} points au-dessus de votre moyenne. Qu'est-ce qui a fonctionné ?`
          : `This was your highest-scoring session overall (${best.score.toFixed(0)}/100) — ${((best.score - overallMean)).toFixed(0)} points above your average. What made it work?`,
      });
    }
    if ((overallMean - worst.score) / overallSD >= 1.2) {
      insights.push({
        type: "anomaly",
        severity: "warning",
        title: isFr
          ? `Résultat bas : "${worst.title}"`
          : `Low outlier: "${worst.title}"`,
        description: isFr
          ? `Cette session a obtenu ${worst.score.toFixed(0)}/100 — ${(overallMean - worst.score).toFixed(0)} points en dessous de votre moyenne. Il peut être utile de revoir le contexte.`
          : `This session scored ${worst.score.toFixed(0)}/100 — ${(overallMean - worst.score).toFixed(0)} points below your average. It may be worth revisiting the context.`,
      });
    }
  }

  const order = { warning: 0, positive: 1, neutral: 2 };
  return insights
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, 4);
}
