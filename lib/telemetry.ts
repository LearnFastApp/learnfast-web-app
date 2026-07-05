import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

export interface EventContext {
  surface?: "web";
  locale?: string;
  utm?: Record<string, string>;
  source?: "try" | "dashboard" | "audience_loop" | "assignment" | "coach";
}

export interface LogEventOptions {
  user_key?: string | null;
  guest_key?: string | null;
  org_id?: string | null;
  session_ref?: string | null;
  context?: EventContext;
  payload?: Record<string, unknown>;
}

/**
 * Append one event to the canonical append-only event log (events collection).
 *
 * Fire-and-forget: never throws, never blocks the calling flow.
 * All analytical writes MUST go through this helper — no ad-hoc event writes elsewhere.
 *
 * Event taxonomy: domain.action (e.g. funnel.try_started, measurement.assessment_completed)
 */
export function logEvent(type: string, opts: LogEventOptions = {}): void {
  const db = getAdminDb();
  const event_id = randomUUID();
  const doc = {
    event_id,
    type,
    ts: FieldValue.serverTimestamp(),
    user_key: opts.user_key ?? null,
    guest_key: opts.guest_key ?? null,
    org_id: opts.org_id ?? null,
    session_ref: opts.session_ref ?? null,
    context: opts.context ?? {},
    payload: opts.payload ?? {},
    schema_version: 1,
  };

  db.collection("events")
    .doc(event_id)
    .set(doc)
    .catch((err) =>
      console.error("[telemetry] logEvent failed (non-blocking):", type, err)
    );
}
