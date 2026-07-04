import { getCultureProfile } from "./culture-profile";

// ---------------------------------------------------------------------------
// buildLocaleBlock — injects the culture profile into any AI prompt.
// Returns an empty string for "en" to preserve pre-FR prompt byte-for-byte.
// ---------------------------------------------------------------------------

export function buildLocaleBlock(locale: string, contextId?: string): string {
  const profile = getCultureProfile(locale);
  if (!profile.assessmentGuidance && !profile.writingGuidance) {
    // English / default — no block injected; prompt is unchanged
    return "";
  }

  const contextOverride = contextId && profile.perContextOverrides[contextId]
    ? `\nCONTEXT-SPECIFIC FRENCH GUIDANCE (${contextId}):\n${profile.perContextOverrides[contextId]}\n`
    : "";

  return `
${profile.assessmentGuidance}

${profile.registerGuidance}
${contextOverride}`.trim() + "\n";
}

export function buildWritingLocaleBlock(locale: string, contextId?: string): string {
  const profile = getCultureProfile(locale);
  if (!profile.writingGuidance) return "";

  const contextOverride = contextId && profile.perContextOverrides[contextId]
    ? `\nCONTEXT-SPECIFIC FRENCH GUIDANCE (${contextId}):\n${profile.perContextOverrides[contextId]}\n`
    : "";

  return `
${profile.writingGuidance}

${profile.registerGuidance}
${contextOverride}`.trim() + "\n";
}
