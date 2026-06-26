type Dimension = "clarity" | "engagement" | "energy" | "understanding" | "connection";

const DIMS: Dimension[] = ["clarity", "engagement", "energy", "understanding", "connection"];
const SIGNIFICANT = 10;

const OVERESTIMATE_EN: Record<Dimension, string> = {
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

const UNDERESTIMATE_EN: Record<Dimension, string> = {
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

const ALIGNED_EN: Record<Dimension, string> = {
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

const OVERESTIMATE_FR: Record<Dimension, string> = {
  clarity:
    "L'écart le plus important porte sur la clarté — le message qui vous semblait bien organisé et structuré n'a peut-être pas été perçu avec la même cohérence par l'audience. Demandez-vous si vos idées clés étaient suffisamment balisées pour quelqu'un qui les découvrait pour la première fois.",
  engagement:
    "L'engagement montre la plus grande divergence — ce qui vous semblait dynamique et interactif n'a peut-être pas été ressenti avec la même énergie par les personnes dans la salle. Des techniques comme les questions directes, les pauses pour observer les réactions ou varier le rythme peuvent aider à combler cet écart.",
  energy:
    "L'énergie est là où les perceptions divergent le plus — votre propre sentiment de présence a été évalué plus haut que ce que l'audience a vécu. L'ancrage physique, la variation vocale intentionnelle et un rythme délibéré tendent à amplifier l'énergie que la salle perçoit réellement.",
  understanding:
    "La compréhension montre le plus grand écart — les concepts clés qui vous semblaient clairs en tant qu'expert ont peut-être nécessité plus de structure ou d'exemples concrets pour que l'audience les assimile pleinement. Intégrer de brefs moments de vérification de la compréhension peut le faire ressortir en temps réel.",
  connection:
    "La connexion est le domaine de plus grande divergence — le rapport que vous ressentiez n'a peut-être pas été perçu avec la même intensité par l'audience. Un contact visuel soutenu, l'utilisation des prénoms et une réponse visible aux signaux de l'audience sont de petits ajustements qui augmentent significativement la connexion ressentie.",
};

const UNDERESTIMATE_FR: Record<Dimension, string> = {
  clarity:
    "Notamment, l'audience a trouvé votre présentation plus claire que vous ne vous en êtes crédité(e) — votre structure et vos explications font mieux effet que votre auto-évaluation ne le suggère. Cela mérite d'être reconnu, car sous-estimer votre propre clarté peut conduire à sur-expliquer lors de futures sessions.",
  engagement:
    "L'audience a évalué votre engagement significativement plus haut que votre propre score — vous créez plus d'énergie et d'intérêt dans la salle que vous ne le percevez depuis l'avant. Faites confiance aux techniques que vous utilisez : elles fonctionnent, même quand elles ne vous semblent pas extraordinaires.",
  energy:
    "La salle a ressenti plus d'énergie de votre part que vous ne pensiez en projeter — votre présence a un impact positif qui peut simplement vous être invisible sur le moment. Votre style naturel résonne davantage que votre expérience interne ne le suggère.",
  understanding:
    "La compréhension de l'audience ressort plus fortement que votre auto-évaluation ne l'indique — les concepts que vous avez transmis ont été mieux assimilés que votre propre sens de la session ne le suggérait. Vos explications et votre cadrage sont clairement efficaces, même si la session ne vous a pas semblé parfaite.",
  connection:
    "L'audience s'est sentie plus connectée à vous que vous ne vous en êtes crédité(e) — vous construisez un vrai rapport qui n'est pas toujours visible depuis l'avant de la salle. C'est une vraie force : beaucoup de présentateurs peinent à créer une connexion authentique, et vous le faites déjà.",
};

const ALIGNED_FR: Record<Dimension, string> = {
  clarity:
    "Les scores de clarté sont en accord étroit — vous et l'audience partagez une lecture cohérente de la façon dont votre message a été structuré et communiqué. Ce niveau de calibration dans une dimension aussi fondamentale que la clarté est un fort indicateur d'une pratique délibérée.",
  engagement:
    "Les scores d'engagement s'alignent bien — votre sentiment sur le niveau de captivation de la session correspond étroitement à ce que l'audience a rapporté. Les présentateurs calibrés sont mieux placés pour faire des ajustements précis car ils ont un modèle interne précis de ce qui fonctionne ou non.",
  energy:
    "La perception de l'énergie est bien alignée — ce que vous avez projeté et ce que l'audience a ressenti sont étroitement concordants. Cette calibration facilite la modulation intentionnelle de l'énergie en réponse à la salle sans avoir à deviner l'effet.",
  understanding:
    "La compréhension est bien calibrée — votre sentiment sur la clarté avec laquelle le contenu a été perçu correspond à l'expérience de l'audience. Utilisez cela comme signal interne fiable lors de la conception de futures sessions : vos instincts sur la compréhension sont dignes de confiance.",
  connection:
    "Les scores de connexion sont en accord étroit — vous et l'audience partagez une lecture commune du niveau de rapport établi durant cette session. La calibration précise de la connexion est l'une des compétences les plus difficiles à développer, et vous le démontrez déjà.",
};

function generateGapInsightEn(audience: Record<Dimension, number>, presenter: Record<Dimension, number>): string {
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

  let opening: string;
  if (overallAvg > 72) {
    opening = "The audience responded strongly to this session, with scores that reflect genuine impact across your five core dimensions.";
  } else if (overallAvg > 58) {
    opening = "Overall, the audience gave this session positive marks — there are real strengths here to acknowledge and build on.";
  } else if (overallAvg > 42) {
    opening = "This session generated moderate audience scores, giving you a clear picture of where focused development will have the most effect.";
  } else {
    opening = "The audience scores from this session point clearly to where your development focus will create the most growth — that kind of signal is genuinely useful.";
  }

  let calibration: string;
  if (pattern === "aligned") {
    calibration = "Your self-assessment closely mirrors how the audience experienced the session — this level of calibration is a mark of strong self-awareness and is relatively uncommon.";
  } else if (pattern === "underestimating") {
    calibration = "Across most dimensions, the audience rated you higher than you rated yourself — you appear to be underselling your own impact as a presenter.";
  } else if (pattern === "overestimating") {
    calibration = "There is a consistent gap between how you perceived the session and how the audience experienced it — in several areas, your self-rating outpaced what the audience reported.";
  } else {
    const overDim = over[0]?.dim ?? "engagement";
    const underDim = under[0]?.dim ?? "clarity";
    calibration = `Your scores diverge in both directions — you underestimated your impact on ${underDim} while rating yourself higher than the audience on ${overDim}, which points to a nuanced picture rather than a simple gap.`;
  }

  const biggestGap = breakdown.reduce((max, b) => (b.abs > max.abs ? b : max));
  let dimensionInsight: string;
  if (pattern === "aligned") {
    const lowestDim = DIMS.reduce((prev, curr) => audience[curr] < audience[prev] ? curr : prev);
    dimensionInsight = ALIGNED_EN[lowestDim];
  } else if (biggestGap.gap > 0) {
    dimensionInsight = OVERESTIMATE_EN[biggestGap.dim];
  } else {
    dimensionInsight = UNDERESTIMATE_EN[biggestGap.dim];
  }

  const lowestDim = DIMS.reduce((prev, curr) => audience[curr] < audience[prev] ? curr : prev);
  let closing: string;
  if (pattern === "aligned" && overallAvg > 65) {
    closing = "Maintain this calibration by reflecting after each session — tracking whether these scores hold across different contexts and audiences is the next step in building a reliable development model.";
  } else if (pattern === "aligned") {
    closing = `Your calibration is a genuine asset — use it to drive deliberate practice in your lower-scoring dimensions, particularly ${lowestDim}, where you already have an accurate sense of what needs attention.`;
  } else if (pattern === "underestimating") {
    closing = "Use this data to recalibrate your confidence — accurately recognising your own impact is an important part of developing the authority and presence that audiences consistently respond to.";
  } else if (pattern === "overestimating" && overallAvg > 65) {
    closing = `Even with strong overall scores, closing this perception gap will give you a more accurate internal model to develop from — starting with ${lowestDim} as your reflective focus is a good first step.`;
  } else if (pattern === "overestimating") {
    closing = `Prioritising ${lowestDim} alongside structured reflection after future sessions will help close this gap and build a more grounded understanding of your actual impact on the room.`;
  } else {
    closing = `The mixed signals here are worth sitting with — focus first on closing the gap in ${biggestGap.gap > 0 ? biggestGap.dim : lowestDim} while continuing to build on the strengths the audience has already noticed.`;
  }

  return `${opening} ${calibration} ${dimensionInsight} ${closing}`;
}

const DIM_LABELS_FR: Record<Dimension, string> = {
  clarity: "clarté",
  engagement: "engagement",
  energy: "énergie",
  understanding: "compréhension",
  connection: "connexion",
};

function generateGapInsightFr(audience: Record<Dimension, number>, presenter: Record<Dimension, number>): string {
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

  let opening: string;
  if (overallAvg > 72) {
    opening = "L'audience a répondu fortement à cette session, avec des scores qui reflètent un impact réel sur vos cinq dimensions clés.";
  } else if (overallAvg > 58) {
    opening = "Dans l'ensemble, l'audience a donné des notes positives à cette session — il y a de vraies forces à reconnaître et sur lesquelles s'appuyer.";
  } else if (overallAvg > 42) {
    opening = "Cette session a généré des scores modérés de l'audience, vous donnant une image claire de là où un développement ciblé aura le plus d'effet.";
  } else {
    opening = "Les scores de l'audience de cette session indiquent clairement où votre développement créera la plus grande croissance — ce type de signal est véritablement utile.";
  }

  let calibration: string;
  if (pattern === "aligned") {
    calibration = "Votre auto-évaluation reflète étroitement la façon dont l'audience a vécu la session — ce niveau de calibration est le signe d'une forte conscience de soi et est relativement rare.";
  } else if (pattern === "underestimating") {
    calibration = "Sur la plupart des dimensions, l'audience vous a évalué(e) plus haut que vous ne vous êtes évalué(e) — vous semblez sous-estimer votre propre impact en tant que présentateur(trice).";
  } else if (pattern === "overestimating") {
    calibration = "Il y a un écart constant entre la façon dont vous avez perçu la session et la façon dont l'audience l'a vécue — dans plusieurs domaines, votre auto-évaluation a dépassé ce que l'audience a rapporté.";
  } else {
    const overDim = DIM_LABELS_FR[over[0]?.dim ?? "engagement"];
    const underDim = DIM_LABELS_FR[under[0]?.dim ?? "clarity"];
    calibration = `Vos scores divergent dans les deux sens — vous avez sous-estimé votre impact sur ${underDim} tout en vous évaluant plus haut que l'audience sur ${overDim}, ce qui indique une image nuancée plutôt qu'un simple écart.`;
  }

  const biggestGap = breakdown.reduce((max, b) => (b.abs > max.abs ? b : max));
  let dimensionInsight: string;
  if (pattern === "aligned") {
    const lowestDim = DIMS.reduce((prev, curr) => audience[curr] < audience[prev] ? curr : prev);
    dimensionInsight = ALIGNED_FR[lowestDim];
  } else if (biggestGap.gap > 0) {
    dimensionInsight = OVERESTIMATE_FR[biggestGap.dim];
  } else {
    dimensionInsight = UNDERESTIMATE_FR[biggestGap.dim];
  }

  const lowestDim = DIMS.reduce((prev, curr) => audience[curr] < audience[prev] ? curr : prev);
  const lowestDimFr = DIM_LABELS_FR[lowestDim];
  let closing: string;
  if (pattern === "aligned" && overallAvg > 65) {
    closing = "Maintenez cette calibration en réfléchissant après chaque session — suivre si ces scores se maintiennent selon différents contextes et audiences est la prochaine étape pour construire un modèle de développement fiable.";
  } else if (pattern === "aligned") {
    closing = `Votre calibration est un véritable atout — utilisez-la pour orienter une pratique délibérée dans vos dimensions les moins bien notées, notamment ${lowestDimFr}, où vous avez déjà une idée précise de ce qui nécessite de l'attention.`;
  } else if (pattern === "underestimating") {
    closing = "Utilisez ces données pour recalibrer votre confiance — reconnaître précisément votre propre impact est une partie importante du développement de l'autorité et de la présence auxquelles les audiences répondent régulièrement.";
  } else if (pattern === "overestimating" && overallAvg > 65) {
    closing = `Même avec des scores globaux solides, combler cet écart de perception vous donnera un modèle interne plus précis — commencer par ${lowestDimFr} comme axe de réflexion est un bon premier pas.`;
  } else if (pattern === "overestimating") {
    closing = `Prioriser ${lowestDimFr} en parallèle d'une réflexion structurée après les prochaines sessions aidera à combler cet écart et à construire une compréhension plus ancrée de votre impact réel sur la salle.`;
  } else {
    const focusDimFr = DIM_LABELS_FR[biggestGap.gap > 0 ? biggestGap.dim : lowestDim];
    closing = `Les signaux mixtes ici méritent réflexion — concentrez-vous d'abord sur la réduction de l'écart en ${focusDimFr} tout en continuant à capitaliser sur les forces que l'audience a déjà remarquées.`;
  }

  return `${opening} ${calibration} ${dimensionInsight} ${closing}`;
}

export function generateGapInsight(
  audience: Record<Dimension, number>,
  presenter: Record<Dimension, number>,
  locale: "en" | "fr" = "en"
): string {
  return locale === "fr"
    ? generateGapInsightFr(audience, presenter)
    : generateGapInsightEn(audience, presenter);
}
