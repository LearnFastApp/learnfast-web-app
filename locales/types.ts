import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Locale catalogue type definitions
// Each namespace mirrors a page or shared component.
// Function-valued entries handle pluralisation and interpolation.
// ---------------------------------------------------------------------------

export interface CommonStrings {
  loading: string;
  saving: string;
  saved: string;
  cancel: string;
  save: string;
  back: string;
  close: string;
  submit: string;
  submitting: string;
  error: string;
  retry: string;
  dashboard: string;
  settings: string;
  signOut: string;
  // Dimension display names (slugs never change — only labels)
  clarity: string;
  energy: string;
  engagement: string;
  understanding: string;
  connection: string;
}

export interface DashboardStrings {
  comingSoon: string;
  pilotAccess: string;
  pilotDaysLeft: (n: number) => string;
  freePlan: string;
  session: (n: number) => string;
  freeSessionsExplore: string;
  freeSession1Left: string;
  freeSessionsUsed: string;
  startTrial: string;
  upgradeLite: string;
  trialFree: string;
  cancelAnytime: string;
  presenter: string;
  signOut: string;
  pageTitle: string;
  pageSubtitle: string;
  createSession: string;
  usedBothFree: string;
  upgradeLiteShort: string;
  tabSessions: string;
  tabReflections: string;
  yourSessions: string;
  noSessionsYet: (cta: string) => ReactNode;
  live: string;
  ended: string;
  responses: (n: number) => string;
  deleteBtn: string;
  loadMore: string;
  loading: string;
  reflectionLog: string;
  reflectionLogSub: string;
  noReflections: string;
  nextFocusPrefix: string;
  howItWent: string;
  joinLinkTitle: string;
  joinLinkDesc: string;
  joinLinkSuffix: string;
  rehearse: string;
  orgMember: string;
  members: string;
  billing: string;
  content: string;
  sessions: string;
  rehearsals: string;
}

export interface AnalyticsStrings {
  pageTitle: string;
  pageSubtitle: string;
  backLink: string;
  allSessions: string;
  sessionsAnalysed: string;
  totalResponses: (n: number) => string;
  overallAverage: string;
  acrossDimensions: string;
  strongestArea: string;
  focusArea: string;
  avgScore: (n: number) => string;
  insightsTitle: string;
  insightsSubtitle: string;
  hide: string;
  show: string;
  noSessions: string;
  noSessionsSub: string;
  perfOverTime: string;
  perfOverTimeSub: string;
  overallProfile: string;
  overallProfileSub: string;
  dimTrends: string;
  flat: string;
  liteFeature: string;
  liteTitle: string;
  liteDesc: string;
  liteBtn: string;
  aiAssessments: string;
  audienceSignal: string;
  aiSignal: string;
  dimTrendsAudLabel: string;
  dimTrendsAiLabel: string;
}

export interface RehearsalStrings {
  rehearsal: string;
  untitled: string;
  takes: (n: number) => string;
  takeLabel: (n: number) => string;
  analysing: (n: number) => string;
  analysingSubtitle: string;
  vsLastTake: string;
  takeScores: (n: number) => string;
  whatsWorking: string;
  coaching: string;
  nextFocus: string;
  suggestScript: string;
  reworkingScript: string;
  scriptImprovements: string;
  fullRevisedScript: string;
  copyScript: string;
  copied: string;
  keepScript: string;
  wpm: string;
  fillerWords: string;
  duration: string;
  bestTakeSaved: string;
  returnFromDashboard: string;
  dashboard: string;
  saving: string;
  saveToHistory: string;
  recordTake: (n: number) => string;
  readyForTake: (n: number) => string;
  record: string;
  upload: string;
  startRecording: string;
  upToMinutes: (n: number) => string;
  clickToUpload: string;
  submitTake: (n: number) => string;
  stopRecording: string;
  recordingReady: (time: string) => string;
  reRecord: string;
  uploading: string;
  errorTitle: string;
  errorFallback: string;
  tryAgain: string;
  errLoad: string;
  errDuration: string;
  errAnalysis: string;
  errTakesLimit: string;
  errFileTooLarge: string;
  errGeneric: string;
  errNetwork: string;
  errSave: string;
  errMic: string;
  errFormat: string;
}

export interface AiAssessmentStrings {
  navBack: string;
  navTitle: string;
  heading: string;
  subheading: string;
  tabRecord: string;
  tabUpload: string;
  recordIdle: string;
  recordIdleSub: string;
  recordRequesting: string;
  recordAutoStop: string;
  recordStopHint: string;
  recordReady: string;
  recordPreviewHint: string;
  reRecord: string;
  dropLabel: string;
  dropSub: string;
  dropFormats: string;
  uploading: string;
  analysing: string;
  analysingDesc: string;
  analyseBtn: string;
  planNote: string;
  errUpgrade: string;
  errLimit: string;
  errMic: string;
}

export interface SettingsStrings {
  pageTitle: string;
  pageSubtitle: string;
  backLink: string;
  loading: string;
  profile: string;
  displayName: string;
  displayNamePlaceholder: string;
  emailAddress: string;
  industryLabel: string;
  industryPlaceholder: string;
  industryNote: string;
  saveChanges: string;
  saving: string;
  saved: string;
  leaderboardSection: string;
  nickname: string;
  nicknamePlaceholder: string;
  nicknameNote: string;
  passwordSection: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  languageSection: string;
  languageNote: string;
  billingSection: string;
  manageBilling: string;
  noBillingAccount: string;
  pilotSection: string;
  pilotCodeLabel: string;
  pilotCodePlaceholder: string;
  apply: string;
  errSave: string;
  errPasswordMatch: string;
  errPasswordLength: string;
  errPasswordCurrent: string;
  errPasswordFailed: string;
  errBillingNone: string;
  errBillingOpen: string;
  errNetwork: string;
  errNicknameLength: string;
  errNicknameSave: string;
}

export interface CreateRehearsalModalStrings {
  title: string;
  subtitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  contextLabel: string;
  recordTab: string;
  uploadTab: string;
  upToMinutes: (n: number) => string;
  startRecording: string;
  stopRecording: string;
  recordingReady: (time: string) => string;
  reRecord: string;
  clickToChoose: string;
  fileTooLarge: string;
  unsupportedFormat: string;
  submit: string;
  submitting: string;
  errUpgrade: string;
  errFreeLimit: string;
  errMonthlyLimit: string;
  errFileTooLarge: string;
  errGeneric: string;
  errNetwork: string;
}

export interface TryStrings {
  heading: string;
  subheading: string;
  contextDropdownLabel: string;
  contextHelper: string;
  analyseBtn: string;
  uploadBtn: string;
  uploadFormats: string;
  uploadingLabel: string;
  analysingLabel: string;
  planNote: string;
  switchToUpload: string;
  switchToRecord: string;
}

export interface GamedayStrings {
  entryHeading: string;
  entrySubheading: string;
  eventNameLabel: string;
  eventNamePlaceholder: string;
  eventDateLabel: string;
  contextLabel: string;
  adjustSettingsToggle: string;
  sessionsPerWeekLabel: string;
  generatePlanBtn: string;
  generating: string;
  sprintModeBanner: (days: number) => string;
  immediateRedirectNote: string;
  planAdjustedBanner: (days: number) => string;
  errGeneric: string;
  errNetwork: string;
  errInvalidDate: string;
  countdownHeader: (days: number) => string;
  gamedayFooterLabel: (days: number) => string;
  sessionOfLabel: (n: number, m: number) => string;
  startSessionBtn: string;
  baselineFraming: string;
  constraintMaxSeconds: (seconds: number) => string;
  constraintStanding: string;
  constraintNoNotes: string;
  constraintAudioOptional: string;
  sessionWhy: Record<
    "triage" | "triage-lite" | "repair" | "fullrun" | "pressure" | "polish" | "confidence" | "warmup" | "debrief",
    string
  >;
  /** Fuller, instructional direction shown right before the user records — what to actually do/say, not just why it matters. */
  sessionGuidance: Record<
    "triage" | "triage-lite" | "repair" | "fullrun" | "pressure" | "polish" | "confidence" | "warmup" | "debrief",
    string
  >;
  sessionGuidanceLabel: string;
  eventDateHelper: string;
  attributionPrompt: (sessionLabel: string) => string;
  attributionYes: string;
  attributionDismiss: string;
  cueCardOpeningLabel: string;
  cueCardAnchorLabel: (n: number) => string;
  cueCardClosingLabel: string;
  editBtn: string;
  saveBtn: string;
  printBtn: string;
  taperEditWarning: string;
  editAnywayBtn: string;
  extractionFailedFallback: string;
  manualCueCardHeading: string;
  warmupBreathingPrompt: string;
  warmupFirstLinePrompt: string;
  goGetItBtn: string;
  startingLiveSession: string;
  goLiveFailedMessage: string;
  debriefPrompt: string;
  debriefUpsellPrompt: string;
  nextDateBtn: string;
  skipBtn: string;
  continueBtn: string;
  roadmapEyebrow: string;
  roadmapHeading: string;
  roadmapSubheading: string;
  roadmapBaselineLabel: string;
  roadmapBaselineDesc: string;
  roadmapBuildLabel: string;
  roadmapBuildDesc: string;
  roadmapTaperLabel: string;
  roadmapTaperDesc: string;
  roadmapCueCardLabel: string;
  roadmapCueCardDesc: string;
  roadmapEventDayLabel: string;
  roadmapEventDayDesc: string;
  roadmapYoureHereTag: string;
  roadmapArrivalHeading: string;
  roadmapArrivalSubheading: string;
  skipAheadPrompt: string;
  skippingAhead: string;
  cueCardReadyHeading: string;
  viewOnWarmupLink: string;
  generateCueCardPrompt: string;
  regenerateCueCardPrompt: string;
  generateCueCardBtn: string;
  regenerateCueCardBtn: string;
  generatingCueCard: string;
  cueCardGenerationFailed: string;
  backToPlanLink: string;
  backToDashboardLink: string;
  roadmapAdjustBelowLink: string;
  roadmapEditCueCardLink: string;
  roadmapGoToWarmupLink: string;
  introEyebrow: string;
  introHeading: string;
  introBody: string;
  introStepPracticeLabel: string;
  introStepCueCardLabel: string;
  introStepEventDayLabel: string;
}

export interface LocaleCatalogue {
  common: CommonStrings;
  dashboard: DashboardStrings;
  analytics: AnalyticsStrings;
  rehearsal: RehearsalStrings;
  aiAssessment: AiAssessmentStrings;
  settings: SettingsStrings;
  createRehearsalModal: CreateRehearsalModalStrings;
  try: TryStrings;
  gameday: GamedayStrings;
}

export type SupportedLocale = "en" | "fr";
