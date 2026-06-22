type Dimension = "clarity" | "engagement" | "energy" | "understanding" | "connection";

const DIMS: Dimension[] = ["clarity", "engagement", "energy", "understanding", "connection"];
const SIGNIFICANT = 10;

const OVERESTIMATE: Record<Dimension, string> = {
  clarity:
    "The widest gap falls on clarity — the message that felt organised and well-structured to you may not have landed with the same coherence for the audience. Consider whether your key ideas were signposted clearly enough for someone encountering them for the first time.",
  engagement:
    "Engagement shows the largest divergence — what felt dynamic and interactive from your perspective may not have translated with the same energy for the people in the room. Techniques like direct questions, pausing for reaction, or varying pace can help bridge this gap.",
  energy:
    "Energy is where perception diverges most — your own sense of presence during this session was rated more highly than the audience experienced it. Physical anchoring, intentional vocal variation, and deliberate pacing tend to amplify the energy the room actually receives.",
  understanding:
    "Understanding shows the biggest gap — key concepts that were clear to you as the expert may have needed more scaffolding or concrete examples for the audience to fully absorb. Building in brief check-for-understanding moments can surface this in real time.",
  connection:
    "Connection is the area of greatest divergence — the rapport you felt may not have come across with the same intensity for the audience. Sustained eye contact, using names, and responding visibly to audience cues are small shifts that significantly increase felt connection.",
};

const UNDERESTIMATE: Record<Dimension, string> = {
  clarity:
    "Notably, the audience found your delivery clearer than you gave yourself credit for — your structure and explanations are landing better than your self-rating suggests. This is worth acknowledging, as underestimating your own clarity can lead to over-explaining in future sessions.",
  engagement:
    "The audience rated your engagement significantly higher than your own score — you are creating more energy and interest in the room than you perceive from the front. Trust that the techniques you are using are working, even when they don't feel extraordinary from your side.",
  energy:
    "The room experienced more energy from you than you felt you were projecting — your presence is having a positive impact that may simply be invisible to you in the moment. Your natural delivery style is resonating more than your internal experience of it suggests.",
  understanding:
    "Audience understanding came through more strongly than your self-rating indicates — the concepts you delivered were absorbed better than your own sense of the session suggested. Your explanations and framing are clearly effective, even if the session didn't feel polished to you.",
  connection:
    "The audience felt more connected to you than you gave yourself credit for — you are building genuine rapport that may not always be visible from the front of the room. This is a real strength: many presenters struggle to generate authentic connection, and you are already doing it.",
};

const ALIGNED: Record<Dimension, string> = {
  clarity:
    "Clarity scores are in close agreement — both you and the audience share a consistent read on how well your message was structured and communicated. This kind of calibration in a dimension as foundational as clarity is a strong indicator of deliberate practice.",
  engagement:
    "Engagement scores align well — your sense of how captivating the session felt closely matches what the audience reported. Calibrated presenters are better placed to make precise adjustments because they have an accurate internal model of what is and isn't working.",
  energy:
    "Energy perception is well-aligned — what you projected and what the audience felt are closely matched. This calibration makes it easier to intentionally dial energy up or down in response to the room without guessing at the effect.",
  understanding:
    "Understanding is well-calibrated — your sense of how clearly the content landed matches the audience's experience. Use this as a reliable internal signal when designing future sessions: your instincts about comprehension are trustworthy.",
  connection:
    "Connection scores are in close agreement — both you and the audience have a shared read on the level of rapport built during this session. Accurate calibration of connection is one of the harder skills to develop, and you are already demonstrating it.",
};

export function generateGapInsight(
  audience: Record<Dimension, number>,
  presenter: Record<Dimension, number>
): string {
  const breakdown = DIMS.map((dim) => ({
    dim,
    gap: presenter[dim] - audience[dim],
    abs: Math.abs(presenter[dim] - audience[dim]),
  }));

  const overallAvg = DIMS.reduce((sum, d) => sum + audience[d], 0) / DIMS.length;
  const significant = breakdown.filter((b) => b.abs > SIGNIFICANT);
  const over = significant.filter((b) => b.gap > 0);
  const under = significant.filter((b) => b.gap < 0);

  let pattern: "aligned" | "underestimating" | "overestimating" | "mixed";
  if (significant.length === 0) {
    pattern = "aligned";
  } else if (over.length >= 3) {
    pattern = "overestimating";
  } else if (under.length >= 3) {
    pattern = "underestimating";
  } else if (over.length > 0 && under.length > 0) {
    pattern = "mixed";
  } else if (over.length > under.length) {
    pattern = "overestimating";
  } else {
    pattern = "underestimating";
  }

  // Opening — overall audience performance
  let opening: string;
  if (overallAvg > 72) {
    opening =
      "The audience responded strongly to this session, with scores that reflect genuine impact across your five core dimensions.";
  } else if (overallAvg > 58) {
    opening =
      "Overall, the audience gave this session positive marks — there are real strengths here to acknowledge and build on.";
  } else if (overallAvg > 42) {
    opening =
      "This session generated moderate audience scores, giving you a clear picture of where focused development will have the most effect.";
  } else {
    opening =
      "The audience scores from this session point clearly to where your development focus will create the most growth — that kind of signal is genuinely useful.";
  }

  // Calibration sentence
  let calibration: string;
  if (pattern === "aligned") {
    calibration =
      "Your self-assessment closely mirrors how the audience experienced the session — this level of calibration is a mark of strong self-awareness and is relatively uncommon.";
  } else if (pattern === "underestimating") {
    calibration =
      "Across most dimensions, the audience rated you higher than you rated yourself — you appear to be underselling your own impact as a presenter.";
  } else if (pattern === "overestimating") {
    calibration =
      "There is a consistent gap between how you perceived the session and how the audience experienced it — in several areas, your self-rating outpaced what the audience reported.";
  } else {
    const overDim = over[0]?.dim ?? "engagement";
    const underDim = under[0]?.dim ?? "clarity";
    calibration = `Your scores diverge in both directions — you underestimated your impact on ${underDim} while rating yourself higher than the audience on ${overDim}, which points to a nuanced picture rather than a simple gap.`;
  }

  // Dimension-specific insight — find the dimension with the biggest absolute gap
  const biggestGap = breakdown.reduce((max, b) => (b.abs > max.abs ? b : max));
  let dimensionInsight: string;
  if (pattern === "aligned") {
    const lowestDim = DIMS.reduce((prev, curr) =>
      audience[curr] < audience[prev] ? curr : prev
    );
    dimensionInsight = ALIGNED[lowestDim];
  } else if (biggestGap.gap > 0) {
    dimensionInsight = OVERESTIMATE[biggestGap.dim];
  } else {
    dimensionInsight = UNDERESTIMATE[biggestGap.dim];
  }

  // Closing — actionable direction
  const lowestDim = DIMS.reduce((prev, curr) =>
    audience[curr] < audience[prev] ? curr : prev
  );
  let closing: string;
  if (pattern === "aligned" && overallAvg > 65) {
    closing =
      "Maintain this calibration by reflecting after each session — tracking whether these scores hold across different contexts and audiences is the next step in building a reliable development model.";
  } else if (pattern === "aligned") {
    closing = `Your calibration is a genuine asset — use it to drive deliberate practice in your lower-scoring dimensions, particularly ${lowestDim}, where you already have an accurate sense of what needs attention.`;
  } else if (pattern === "underestimating") {
    closing =
      "Use this data to recalibrate your confidence — accurately recognising your own impact is an important part of developing the authority and presence that audiences consistently respond to.";
  } else if (pattern === "overestimating" && overallAvg > 65) {
    closing = `Even with strong overall scores, closing this perception gap will give you a more accurate internal model to develop from — starting with ${lowestDim} as your reflective focus is a good first step.`;
  } else if (pattern === "overestimating") {
    closing = `Prioritising ${lowestDim} alongside structured reflection after future sessions will help close this gap and build a more grounded understanding of your actual impact on the room.`;
  } else {
    closing = `The mixed signals here are worth sitting with — focus first on closing the gap in ${biggestGap.gap > 0 ? biggestGap.dim : lowestDim} while continuing to build on the strengths the audience has already noticed.`;
  }

  return `${opening} ${calibration} ${dimensionInsight} ${closing}`;
}
