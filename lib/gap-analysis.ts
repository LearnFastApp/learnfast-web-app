const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

export interface DimensionScores {
  clarity: number;
  energy: number;
  engagement: number;
  understanding: number;
  connection: number;
}

export type GapSeverity = "aligned" | "notable" | "significant";

export interface GapInsight {
  dimension: Dimension;
  gap: number; // positive = signalA > signalB
  severity: GapSeverity;
  interpretation: string;
  coaching: string;
}

export interface SignalGapAnalysis {
  signalA: string;
  signalB: string;
  gaps: GapInsight[];
  overallDivergence: number; // mean absolute gap across dimensions
  summary: string;
  headline: string;
}

const SIGNIFICANT_THRESHOLD = 20;
const NOTABLE_THRESHOLD = 10;

function severity(gap: number): GapSeverity {
  const abs = Math.abs(gap);
  if (abs >= SIGNIFICANT_THRESHOLD) return "significant";
  if (abs >= NOTABLE_THRESHOLD) return "notable";
  return "aligned";
}

function avg(scores: DimensionScores): number {
  return Math.round(
    DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / DIMENSIONS.length
  );
}

// ─── AI vs Audience interpretation ───────────────────────────────────────────

const AI_VS_AUDIENCE: Record<Dimension, { high: string; low: string; highCoach: string; lowCoach: string }> = {
  clarity: {
    high: "Your content was clearly structured but the audience felt less certain. This gap often means your message was clear in form but felt too rehearsed or complex in delivery.",
    low: "Despite technical clarity issues — pace or filler words — your audience still followed you well. You likely read the room and adapted instinctively.",
    highCoach: "Simplify your language further and build in deliberate check-ins with your audience. 'Does that make sense?' at key transitions significantly improves perceived clarity.",
    lowCoach: "Your instinct for clarity is strong. Now make it structural — reduce filler words and control pace so every session is as clear as this one, regardless of nerves.",
  },
  energy: {
    high: "Your vocal energy was strong in the recording but the audience didn't feel energised. Energy that feels performed rather than genuine rarely translates to the room.",
    low: "Your energy may have read flat in the recording but came across well live. Stage presence and eye contact — unmeasured by AI — are likely carrying your energy score.",
    highCoach: "Connect your enthusiasm directly to why the content matters to this specific audience. Genuine investment in the room creates more energy than vocal technique alone.",
    lowCoach: "Your live energy is a real strength. Make it more consistent by building vocal variety deliberately into high-stakes moments so it shows even when you're nervous.",
  },
  engagement: {
    high: "Your transcript shows strong storytelling techniques but the audience wasn't captivated. The technique is there — the commitment and timing of delivery may need work.",
    low: "You engaged your audience despite limited storytelling markers in your script. You likely improvise and adapt brilliantly. Now make it deliberate.",
    highCoach: "Pause before your key stories. Give the room a moment to lean in before you deliver. Engagement is as much about silence and pacing as it is about the story itself.",
    lowCoach: "Add one planned story per presentation with a clear character, problem, and resolution. Your natural delivery will make it land — the structure will make it consistent.",
  },
  understanding: {
    high: "Your explanations were well-structured but the audience still didn't follow. This typically means content was pitched above their knowledge level. Know your room.",
    low: "Despite limited use of analogies, your audience understood the message. You may use non-verbal explanation techniques — diagrams, pauses, demonstrations — that a recording can't capture.",
    highCoach: "Before your next session, ask yourself: 'What does this audience already know, and what do they need to know?' Then build your analogies from their world, not yours.",
    lowCoach: "Add one analogy per key concept — something from your audience's daily world. 'Think of it like...' is one of the most powerful phrases in a presenter's toolkit.",
  },
  connection: {
    high: "Your language was inclusive and warm but the audience didn't feel personally connected. In-person connection is about eye contact, responsiveness, and genuine presence — not just words.",
    low: "You connected strongly with this audience despite limited connection-focused language. Your authentic personality is powerful. Now amplify it with more direct address.",
    highCoach: "Pick one person in different sections of the room and speak directly to them for 10–15 seconds before shifting. This creates genuine eye contact that the whole room feels.",
    lowCoach: "Add their names, their context, their challenges to your script. 'You're probably thinking...' and 'We've all been in that situation...' create instant rapport at scale.",
  },
};

// ─── AI vs Self-Reflection interpretation ────────────────────────────────────

const AI_VS_SELF: Record<Dimension, { high: string; low: string; highCoach: string; lowCoach: string }> = {
  clarity: {
    high: "You were clearer than you thought. Your structure and language landed better than your self-assessment suggests.",
    low: "You rated your own clarity higher than the objective analysis. There may be a gap between how logical the content feels to you and how it lands externally.",
    highCoach: "Trust your preparation. Your clarity instincts are good — focus on the moments you felt least certain, as those are likely where your audience notices it too.",
    lowCoach: "Record yourself explaining a key concept to someone unfamiliar with your topic. The Curse of Knowledge is real — what's obvious to you isn't to your audience.",
  },
  energy: {
    high: "You came across with more energy than you felt. Nerves and effort often read as dynamism to the audience even when they feel like strain to the presenter.",
    low: "You rated your own energy higher than the analysis suggests. Monotone delivery is often invisible to the speaker — it can feel like calm, confident control from the inside.",
    highCoach: "When you feel least energetic is often when the audience needs it most. Build in physical anchors — a step forward, a gesture — that trigger a lift in vocal energy.",
    lowCoach: "Record a 60-second version of your key message. Play it back without watching — just listen to the vocal range. This builds awareness of vocal variety faster than any other technique.",
  },
  engagement: {
    high: "Your content was more engaging than you gave yourself credit for. Your storytelling instincts work — even when you don't feel like they are.",
    low: "You rated engagement higher than the analysis found. It's possible your stories feel vivid internally but need more specific detail, tension, or resolution to land externally.",
    highCoach: "The engagement is there — now systematise it. After each presentation, note which moment got the strongest response, and reverse-engineer why.",
    lowCoach: "Ask 'what's the conflict?' about every story you tell. If there's no tension, there's no engagement. The resolution means nothing without a problem the audience cares about.",
  },
  understanding: {
    high: "Your explanations were clearer than you thought. The analogies and examples you used worked — even the ones you were unsure about.",
    low: "You rated your explanations higher than the analysis found. Deep expertise can make it genuinely difficult to remember what it's like not to know something.",
    highCoach: "Ask a trusted colleague outside your domain to listen to your key explanation. If they can explain it back in their own words, your analogy worked.",
    lowCoach: "For every concept, challenge yourself to find the simplest possible analogy. If it feels too simple, it's probably exactly right for your audience.",
  },
  connection: {
    high: "You connected better than you felt you did. Authentic vulnerability and uncertainty can read as warmth and relatability — not weakness.",
    low: "You rated your connection higher than the analysis found. Connection requires the audience to feel seen — not just addressed. This is subtle and often the last skill to develop.",
    highCoach: "Connection starts before the presentation. Arrive early, talk to people, learn one name. Every second of pre-presentation human contact multiplies your in-room connection.",
    lowCoach: "Add one moment of genuine personal disclosure to every presentation — something true about your own experience with the topic. Vulnerability is the shortcut to connection.",
  },
};

// ─── Audience vs Self-Reflection interpretation ───────────────────────────────

const AUDIENCE_VS_SELF: Record<Dimension, { high: string; low: string; highCoach: string; lowCoach: string }> = {
  clarity: {
    high: "Your audience found you clearer than you felt you were. This is imposter syndrome in action — trust the data, not the inner critic.",
    low: "You felt clearer than your audience experienced. The gap between internal logic and external reception is one of the most common presenter blind spots.",
    highCoach: "Start collecting this data across sessions. Consistent gaps between your self-assessment and audience scores are your most reliable signal for where to focus development.",
    lowCoach: "After your next session, ask one audience member to tell you the single key takeaway. If it matches what you intended, your clarity is landing. If not, the gap is in delivery not content.",
  },
  energy: {
    high: "The room felt your energy even when you didn't. Your authentic effort and investment show more than nerves make you believe.",
    low: "You felt more energetic than the audience experienced. Energy felt internally as effort doesn't always transmit — it needs to become expressiveness.",
    highCoach: "This is about learning to trust that your internal effort is visible. It usually is — keep showing up with the same investment.",
    lowCoach: "Film yourself presenting. What you see will almost always surprise you — either more or less energy than you felt. Visual feedback closes this gap faster than anything.",
  },
  engagement: {
    high: "Your audience was more engaged than you thought they were. Their silence was attention, not disinterest.",
    low: "You felt the room was engaged but the scores suggest otherwise. Polite attention and genuine engagement look similar from the front of the room — the scores reveal the difference.",
    highCoach: "If this is consistent, start using engagement techniques that give you real-time feedback — questions, show of hands, brief discussion. Don't guess — verify.",
    lowCoach: "Build in one audience interaction point per presentation — not just rhetorical questions but moments where you genuinely wait for their input. The response will calibrate your read of the room.",
  },
  understanding: {
    high: "Your audience understood more than you thought they did. Give yourself credit for explanations that worked.",
    low: "You felt your message was landing but the audience didn't follow as well as you thought. This often happens when we mistake nodding for understanding.",
    highCoach: "Keep doing what you're doing — this calibration is healthy and developing.",
    lowCoach: "Build comprehension checks into your presentations. 'Before I move on — what questions do you have about that?' surfaces confusion in real time rather than in post-session scores.",
  },
  connection: {
    high: "Your audience felt more connected to you than you felt to them. You were creating genuine warmth even when you felt disconnected.",
    low: "You felt a stronger connection with this audience than they experienced. It's possible the warmth you felt was internal energy that didn't fully transmit externally.",
    highCoach: "This is a real strength — your authentic warmth comes through even when you doubt it. Now channel it deliberately into moments of direct personal address.",
    lowCoach: "Connection is a two-way signal. After your next session, spend five minutes talking with audience members one-to-one. Notice how different it feels from the front of the room.",
  },
};

// ─── Gap generation ───────────────────────────────────────────────────────────

function buildGaps(
  scoreA: DimensionScores,
  scoreB: DimensionScores,
  table: typeof AI_VS_AUDIENCE
): GapInsight[] {
  return DIMENSIONS.map((dim) => {
    const gap = scoreA[dim] - scoreB[dim];
    const abs = Math.abs(gap);
    const s = severity(gap);
    const entry = table[dim];
    const isHigherA = gap > 0;

    return {
      dimension: dim,
      gap,
      severity: s,
      interpretation: s === "aligned"
        ? `Signals are aligned on ${dim} — a strong indicator of consistency.`
        : isHigherA ? entry.high : entry.low,
      coaching: s === "aligned" ? "" : isHigherA ? entry.highCoach : entry.lowCoach,
    };
  }).filter((g) => g.severity !== "aligned" || true); // return all, UI can filter by severity
}

function summarise(gaps: GapInsight[], signalA: string, signalB: string): { headline: string; summary: string } {
  const significant = gaps.filter((g) => g.severity === "significant");
  const notable = gaps.filter((g) => g.severity === "notable");
  const aligned = gaps.filter((g) => g.severity === "aligned");

  if (aligned.length === DIMENSIONS.length) {
    return {
      headline: `${signalA} and ${signalB} are tightly aligned`,
      summary: `Your ${signalA.toLowerCase()} and ${signalB.toLowerCase()} scores are consistent across all five dimensions — a sign of self-awareness and predictable performance.`,
    };
  }

  if (significant.length >= 3) {
    return {
      headline: `Significant divergence between ${signalA} and ${signalB}`,
      summary: `There is a meaningful gap between how the ${signalA.toLowerCase()} sees your presentation and how the ${signalB.toLowerCase()} experienced it. The most important development opportunity sits in understanding why.`,
    };
  }

  const topGap = gaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  const dirWord = topGap.gap > 0
    ? `your ${signalA.toLowerCase()} scores exceeded ${signalB.toLowerCase()}`
    : `your ${signalB.toLowerCase()} scores exceeded ${signalA.toLowerCase()}`;

  return {
    headline: `Largest gap on ${topGap.dimension.charAt(0).toUpperCase() + topGap.dimension.slice(1)}`,
    summary: `Overall signals are reasonably aligned, but ${dirWord} most on ${topGap.dimension} (${Math.abs(topGap.gap)} points). This is your most targeted area for development.`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyseAiVsAudience(ai: DimensionScores, audience: DimensionScores): SignalGapAnalysis {
  const gaps = buildGaps(ai, audience, AI_VS_AUDIENCE);
  const divergence = Math.round(gaps.reduce((s, g) => s + Math.abs(g.gap), 0) / gaps.length);
  const { headline, summary } = summarise(gaps, "AI Assessment", "Audience Feedback");
  return { signalA: "AI Assessment", signalB: "Audience Feedback", gaps, overallDivergence: divergence, headline, summary };
}

export function analyseAiVsSelf(ai: DimensionScores, reflection: DimensionScores): SignalGapAnalysis {
  const gaps = buildGaps(ai, reflection, AI_VS_SELF);
  const divergence = Math.round(gaps.reduce((s, g) => s + Math.abs(g.gap), 0) / gaps.length);
  const { headline, summary } = summarise(gaps, "AI Assessment", "Self-Reflection");
  return { signalA: "AI Assessment", signalB: "Self-Reflection", gaps, overallDivergence: divergence, headline, summary };
}

export function analyseAudienceVsSelf(audience: DimensionScores, reflection: DimensionScores): SignalGapAnalysis {
  const gaps = buildGaps(audience, reflection, AUDIENCE_VS_SELF);
  const divergence = Math.round(gaps.reduce((s, g) => s + Math.abs(g.gap), 0) / gaps.length);
  const { headline, summary } = summarise(gaps, "Audience Feedback", "Self-Reflection");
  return { signalA: "Audience Feedback", signalB: "Self-Reflection", gaps, overallDivergence: divergence, headline, summary };
}

export function overallDivergenceScore(analyses: SignalGapAnalysis[]): number {
  return Math.round(analyses.reduce((s, a) => s + a.overallDivergence, 0) / analyses.length);
}
