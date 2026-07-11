/**
 * Enterprise feature flag.
 *
 * Phase 0–5: gate is env-based (ENTERPRISE_ENABLED=true in apphosting.yaml).
 * Phase 6: gate removed on Ollie's explicit go-ahead (see BACKLOG P6-6).
 *
 * Future: extend with per-org overrides by checking the org doc's `plan` field
 * in getOrgContext — any org with plan === 'enterprise' bypasses the global flag.
 */
export function isEnterpriseEnabled(): boolean {
  return process.env.ENTERPRISE_ENABLED === "true";
}

/**
 * Context Engine feature flag (Context-Aware Assessment V1).
 * Set NEXT_PUBLIC_FEATURE_CONTEXTS=true in apphosting.yaml to enable.
 * When disabled, all flows behave exactly as before — contextId defaults to "general"
 * and no context UI is shown.
 */
export function isContextsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_CONTEXTS === "true";
}

/**
 * Gameday Mode / Sprint Mode feature flag (event-backed periodisation plans).
 * Set NEXT_PUBLIC_FEATURE_GAMEDAY_MODE=true in apphosting.yaml to enable.
 * When disabled, no Gameday UI is shown and no new collections are touched —
 * all existing flows behave exactly as before.
 */
export function isGamedayModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_GAMEDAY_MODE === "true";
}

/**
 * Convenience assertion for API routes. Throws a typed error object
 * so callers can return a consistent 403 response.
 *
 * Usage:
 *   requireEnterprise();
 *   // ... rest of handler
 */
export function requireEnterprise(): void {
  if (!isEnterpriseEnabled()) {
    throw new EnterpriseFeatureError();
  }
}

export class EnterpriseFeatureError extends Error {
  readonly code = "enterprise_disabled";
  constructor() {
    super("Enterprise features are not enabled");
    this.name = "EnterpriseFeatureError";
  }
}
