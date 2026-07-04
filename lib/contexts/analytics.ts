type ContextSurface = "try" | "app";

function fireGtag(event: string, params: Record<string, string>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params);
  }
}

export function trackContextSelected(contextId: string, surface: ContextSurface) {
  fireGtag("context_selected", { context_id: contextId, surface });
}

export function trackAssessmentCompleted(contextId: string, contextPromptVersion: string) {
  fireGtag("assessment_completed", { context_id: contextId, context_prompt_version: contextPromptVersion });
}
