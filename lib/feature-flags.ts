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
