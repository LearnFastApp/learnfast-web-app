export const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type DimensionWeight = "low" | "standard" | "high" | "critical";

export interface AssessmentContext {
  contextId: string;
  label: string;
  description: string;
  successDefinition: string;
  dimensionWeights: Record<Dimension, DimensionWeight>;
  dimensionReinterpretations: Record<Dimension, string>;
  audioOnly?: boolean;
  promptVersion: string;
  enabled: boolean;
  sortOrder: number;
}

export const CONTEXT_REGISTRY: AssessmentContext[] = [
  {
    contextId: "general",
    label: "General Presentation",
    description: "Balanced assessment across all dimensions — the default.",
    successDefinition: "Deliver a clear, engaging, and well-structured presentation that communicates ideas effectively to a general audience.",
    dimensionWeights: {
      clarity: "standard",
      energy: "standard",
      engagement: "standard",
      understanding: "standard",
      connection: "standard",
    },
    dimensionReinterpretations: {
      clarity: "Assess clear structure, precise language, and minimal cognitive load as in the standard rubric.",
      energy: "Evaluate enthusiasm, vocal variation, and sustained pace throughout the presentation.",
      engagement: "Judge storytelling, hooks, rhetorical questions, and devices that sustain audience attention.",
      understanding: "Rate analogies, examples, and repetition that help the audience retain and explain the core message.",
      connection: "Score warmth, direct address, empathy, and emotional relatability throughout.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 0,
  },
  {
    contextId: "board_presentation",
    label: "Board / Executive Presentation",
    description: "Win confidence and a decision from time-poor senior stakeholders.",
    successDefinition: "Earn the room's confidence and secure a clear decision from senior executives by demonstrating precision, composure, and complete command of the material.",
    dimensionWeights: {
      clarity: "critical",
      energy: "standard",
      engagement: "standard",
      understanding: "high",
      connection: "high",
    },
    dimensionReinterpretations: {
      clarity: "Structure and precision are paramount — any ambiguity forces follow-up questions, which signals unpreparedness. Score down hard for vague language or unclear recommendations.",
      energy: "Composed authority is the ideal; excessive enthusiasm reduces credibility. Judge controlled, confident delivery over expressiveness.",
      engagement: "Data framing and logical narrative structure matter more than storytelling; reward structured thinking and crisp use of evidence.",
      understanding: "Score on how quickly a time-poor executive could grasp the recommendation and the evidence behind it without prior briefing.",
      connection: "Credibility signals, respect for seniority, and command presence; warmth is secondary to the feeling that this person knows their brief completely.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 1,
  },
  {
    contextId: "team_talk",
    label: "Team Talk / Staff Room",
    description: "Move a group to aligned action through conviction and shared purpose.",
    successDefinition: "Drive a team to aligned action by combining emotional connection, message simplicity, and visible personal conviction in the outcome.",
    dimensionWeights: {
      clarity: "high",
      energy: "high",
      engagement: "high",
      understanding: "standard",
      connection: "critical",
    },
    dimensionReinterpretations: {
      clarity: "Message simplicity — one main point, stated plainly and repeated. Complexity kills alignment; score down for anything that splits the team's attention.",
      energy: "Emotional drive and visible conviction; flat delivery in a team talk signals disbelief in the message and drains the room of energy.",
      engagement: "Shared identity, 'we' language, and rallying narrative; reward rhetorical devices that unify rather than inform.",
      understanding: "Practical clarity — after listening, can every person in the room immediately explain what is needed of them?",
      connection: "Emotional connection is the primary success factor in this context; score on felt relatability, genuine warmth, and the sense that the speaker is one of the team.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 2,
  },
  {
    contextId: "investor_pitch",
    label: "Investor Pitch",
    description: "Earn belief and a follow-up meeting with logic, credibility, and command of numbers.",
    successDefinition: "Earn investor belief in the opportunity and the team by combining a compelling narrative with crisp command of the numbers, market logic, and honest handling of scepticism.",
    dimensionWeights: {
      clarity: "high",
      energy: "standard",
      engagement: "high",
      understanding: "critical",
      connection: "high",
    },
    dimensionReinterpretations: {
      clarity: "Logical narrative from problem to solution to market to ask — each step must set up the next without ambiguity or backtracking.",
      energy: "Controlled conviction — certainty without arrogance signals belief in the opportunity; desperation and over-excitement are red flags.",
      engagement: "Narrative tension and memorability of the opportunity; investors hear hundreds of pitches, so score on whether this one would be remembered tomorrow.",
      understanding: "Score on how clearly the market size, business model, unit economics, and competitive moat are explained to a financially literate audience.",
      connection: "Credibility and trust signals — does the speaker convince the audience they are the right person to build this? Score on founder belief.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 3,
  },
  {
    contextId: "cold_call",
    label: "Cold Call / Phone Pitch",
    description: "Earn the next 30 seconds through speed, hook clarity, and vocal energy.",
    successDefinition: "Earn the prospect's next 30 seconds of attention by opening with a sharp hook, delivering a clear value proposition, and handling the instinct to hang up.",
    dimensionWeights: {
      clarity: "critical",
      energy: "critical",
      engagement: "high",
      understanding: "standard",
      connection: "high",
    },
    dimensionReinterpretations: {
      clarity: "Every word must earn its place — score down for any preamble, padding, or ambiguous framing in the opening 15 seconds. No warm-up allowed.",
      energy: "Vocal pace, urgency, and tonal variation in the first 15 seconds are everything in this format. Physical presence is irrelevant — do not penalise or reference it.",
      engagement: "Hook speed — how many seconds pass before there is a clear reason to keep listening? Score this ruthlessly.",
      understanding: "The value proposition must land in a single sentence; complex explanations lose the prospect before the second breath.",
      connection: "Conversational tone and objection empathy; the prospect must feel heard and understood, not sold at. Score on natural human warmth under pressure.",
    },
    audioOnly: true,
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 4,
  },
  {
    contextId: "conference_talk",
    label: "Conference / Keynote Talk",
    description: "Be memorable and authoritative to a large, passive audience.",
    successDefinition: "Leave a large passive audience with a clear memorable idea, a feeling of having been genuinely informed, and a lasting impression of the speaker's authority.",
    dimensionWeights: {
      clarity: "high",
      energy: "high",
      engagement: "critical",
      understanding: "standard",
      connection: "high",
    },
    dimensionReinterpretations: {
      clarity: "Visible structure for a passive audience — clear signposting, clean transitions, and one memorable throughline that survives being half-distracted.",
      energy: "Stage presence and vocal projection across a long time window; the speaker must hold attention without dialogue or interaction to lean on.",
      engagement: "Storytelling architecture and moment creation are the core skill here; conference talks survive by the two or three moments the audience remembers next week.",
      understanding: "Complex ideas made accessible for a broad, mixed-expertise audience; assume minimal prior knowledge and reward concrete illustration.",
      connection: "Emotional resonance and authority that travel across a large, anonymous room without the benefit of eye contact or personal rapport.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 5,
  },
  {
    contextId: "coach_to_athletes",
    label: "Coaching Session (Coach → Athletes)",
    description: "Land instruction and belief with athletes across the training week.",
    successDefinition: "Give athletes clear, actionable instruction while building the belief and trust that drives performance when it counts.",
    dimensionWeights: {
      clarity: "critical",
      energy: "high",
      engagement: "high",
      understanding: "standard",
      connection: "critical",
    },
    dimensionReinterpretations: {
      clarity: "Instruction precision above all — athletes must leave knowing exactly what to do and why; any ambiguity becomes a performance error on the field.",
      energy: "Tone-matching to the session's purpose — pre-game needs drive and urgency, post-match debrief needs composure and reflection. Score appropriateness, not just volume.",
      engagement: "Brief, vivid, action-oriented language; athletes respond to demonstration language and specific imagery, not lectures or theory.",
      understanding: "Technical instruction clarity — can an athlete immediately visualise and execute the cue without needing to ask a clarifying question?",
      connection: "Credibility, genuine belief in the athlete, and earned trust; coaches who visibly believe in their athletes' capability earn belief and effort in return.",
    },
    promptVersion: "1.0.0",
    enabled: true,
    sortOrder: 6,
  },
];

export function getContext(contextId: string): AssessmentContext {
  return (
    CONTEXT_REGISTRY.find((c) => c.contextId === contextId && c.enabled) ??
    CONTEXT_REGISTRY[0]
  );
}

export function getEnabledContexts(): AssessmentContext[] {
  return CONTEXT_REGISTRY.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}
