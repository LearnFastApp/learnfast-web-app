// ---------------------------------------------------------------------------
// Locale Culture Profile — V1
// Injected into every AI call (scoring, coaching, script writing) alongside
// the Context Engine block. Versioned so outputs are traceable.
// ---------------------------------------------------------------------------

export interface LocaleCultureProfile {
  locale: string;                              // BCP-47 locale tag, e.g. "fr-FR"
  cultureVersion: string;                      // semver — bump on any substantive change
  assessmentGuidance: string;                  // how to judge delivery in this culture
  writingGuidance: string;                     // how to WRITE scripts in this culture
  registerGuidance: string;                    // formality, tu/vous, tone conventions
  perContextOverrides: Record<string, string>; // contextId → extra French-culture guidance
}

// ---------------------------------------------------------------------------
// English / Default — empty profile; AI defaults to Anglo-American norms
// ---------------------------------------------------------------------------
export const EN_CULTURE_PROFILE: LocaleCultureProfile = {
  locale: "en",
  cultureVersion: "1.0.0",
  assessmentGuidance: "",
  writingGuidance: "",
  registerGuidance: "",
  perContextOverrides: {},
};

// ---------------------------------------------------------------------------
// French (fr-FR) — V1.0.0
// Substance from spec §3. Wording refined for prompt effectiveness.
// ---------------------------------------------------------------------------
export const FR_CULTURE_PROFILE: LocaleCultureProfile = {
  locale: "fr-FR",
  cultureVersion: "1.0.0",

  assessmentGuidance: `
CULTURAL ASSESSMENT FRAME — FRENCH PROFESSIONAL CONTEXT (fr-FR):
Apply the following norms when scoring and writing feedback for this French-language presentation:

1. STRUCTURE IS COMPETENCE. French professional culture prizes an explicitly articulated logical structure — the classical plan (thèse/antithèse/synthèse or two/three-part exposé). Reward clear signposting of structure and well-built argumentation. A French professional audience reads structural discipline as mastery; a disorganised presentation scores lower on Clarity and Understanding than it would in an Anglo-American context.

2. REGISTER IS CREDIBILITY. Vous is the default in every professional scenario without exception. Misjudged informality (tu used improperly, excessive casual language) is a credibility error, not a stylistic quirk — penalise it in Connection and Clarity. Anglo-American hype registers ("incroyable!", superlatives, relentless enthusiasm, cheerleading openers) read as unserious in French professional settings; conviction is expressed through precision, controlled delivery and demonstrated command of the subject.

3. ENGAGEMENT THROUGH INTELLECT. Engagement and Connection should be assessed through elegance of expression, well-placed nuance, and respect for the audience's intelligence — not through personal anecdotes-per-minute or forced relatability. A witty, precisely-worded point scores higher on Engagement than a personal story that disrupts the argumentative flow.

4. COMPLEXITY IS RESPECTED. French business communication tolerates — and often expects — argument, qualification and acknowledgement of complexity. A pitch that oversimplifies or refuses to engage with objections should score lower on Understanding, not higher on Clarity. Intellectual honesty about nuance is a feature, not a bug.

5. RAPPORT THROUGH PRECISION. Connection is built through intellectual seriousness, not warmth alone. A presenter who demonstrates that they have thought carefully about the audience's situation — and shows it through tailored, precise language — builds more Connection than one who uses relational openers without substance.
`.trim(),

  writingGuidance: `
SCRIPT WRITING GUIDANCE — FRENCH (fr-FR):
When generating or rewriting scripts in French, apply these principles:

1. WRITE NATIVELY IN FRENCH. Do not draft mentally in English and translate. Idiom, rhythm and rhetorical patterns must be French — use rhetorical questions, triads, and formal transitions naturally: d'abord / ensuite / enfin; or; en somme; il convient de noter que; c'est pourquoi.

2. VOUS THROUGHOUT. Default to vous in all professional scripts. Use tu only if the user explicitly confirms a tu-appropriate context (e.g. internal peers who have established tutoiement).

3. TYPOGRAPHY. Apply French typographic conventions: use guillemets « » for quotations rather than " "; use em-dashes (—) correctly; express numbers with spaces as thousands separators (1 000 €); use the 24-hour clock where times appear.

4. AVOID CALQUES AND ANGLICISMS. Where a natural French equivalent exists, use it. Where business franglais is genuinely standard in context (le pitch, le feedback, le brainstorming), use it consistently but do not introduce anglicisms unnecessarily.

5. STRUCTURAL CONVENTIONS. Open with a clear framing of the question or problem before moving to recommendations. Use explicit transitional markers. Close with a synthesis rather than a call to action alone. A French audience expects to follow a clear argumentative arc.
`.trim(),

  registerGuidance: `
REGISTER GUIDANCE — FRENCH PROFESSIONAL (fr-FR):
- Vouvoiement (vous) is mandatory in all professional contexts unless explicitly stated otherwise.
- Avoid superlatives and hyperbolic enthusiasm — they undermine credibility with a French audience.
- Formal closings and openings are functional in French professional communication, not decorative — their absence is a delivery error.
- Maintain intellectual seriousness throughout; warmth is expressed through precision and respect, not informality.
`.trim(),

  perContextOverrides: {
    general: `In a general French professional context, prioritise structural clarity and formal register above all. A well-organised presentation with clear logical flow is the baseline expectation.`,

    investor_pitch: `French investor pitches require explicit market logic, rigorous financial reasoning and acknowledged risk. Investors expect a structured exposé (problem / solution / market / model / team) with intellectual honesty about uncertainties. Avoid American-style hype; French VCs respond to rigour and credible humility. Politeness formulae at opening and close are expected.`,

    board_presentation: `French board presentations open with a structured framing of the question before any recommendations — never lead with conclusions. The conseil d'administration expects logical sequence, source attribution, and clear separation of facts from recommendations. Formal register is non-negotiable; any informality signals lack of preparation.`,

    team_talk: `French team motivation can carry genuine emotion, but it must be anchored in collective purpose and shared values (esprit d'équipe), not individualist exhortation. Acknowledge the team's efforts explicitly before issuing direction. Vous may give way to nous (collective voice) for cohesion, but avoid the tu of a peer if speaking in a hierarchical role.`,

    cold_call: `French cold calls have strict politeness conventions that are functional, not decorative: a proper opening formula ("Bonjour, je me permets de vous contacter…"), reason statement, clear value proposition, and a polite closing. Skipping these signals disrespect and typically ends the call. Be concise but complete — brevity without politeness is rudeness.`,

    conference_talk: `French conference talks reward intellectual substance and structured argument. The audience expects a clear announced plan ("Je vais vous présenter en trois points…") and is comfortable with complexity. Avoid oversimplification; a nuanced point delivered with precision is more valued than a memorable soundbite without depth.`,

    coach_to_athletes: `In French sports coaching, authority and technical expertise are the primary sources of credibility. Feedback is expected to be direct and specific. Emotional encouragement is appropriate but secondary to tactical clarity. Tu is standard in athlete-coach communication in France once rapport is established. Collective nous reinforces team identity.`,
  },
};

export const CULTURE_PROFILES: Record<string, LocaleCultureProfile> = {
  en: EN_CULTURE_PROFILE,
  "en-GB": EN_CULTURE_PROFILE,
  "en-US": EN_CULTURE_PROFILE,
  fr: FR_CULTURE_PROFILE,
  "fr-FR": FR_CULTURE_PROFILE,
};

export function getCultureProfile(locale: string): LocaleCultureProfile {
  return CULTURE_PROFILES[locale] ?? EN_CULTURE_PROFILE;
}
