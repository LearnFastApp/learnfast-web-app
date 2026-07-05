import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

export type InterventionKind =
  | "archetype_tip"
  | "improvement_focus"
  | "assigned_rehearsal"
  | "coach_suggestion"
  | "content_item";

export type InterventionDimension =
  | "clarity"
  | "energy"
  | "engagement"
  | "understanding"
  | "connection"
  | "general";

export type InterventionStatus = "prescribed" | "viewed" | "completed" | "dismissed";

export interface PrescribeInterventionOptions {
  user_key: string;
  kind: InterventionKind;
  target_dimension: InterventionDimension;
  source: "ai_report" | "org_assignment" | "coach" | "system";
  content_ref: string;
  triggered_by_measurement?: string | null;
}

/**
 * Record what the system just prescribed — a tip, assignment, coach suggestion, etc.
 *
 * This is the collection competitors won't have. Even crude rule-based prescriptions
 * captured now create the training substrate for the future recommendation engine.
 *
 * Returns the intervention_id.
 */
export async function prescribeIntervention(
  opts: PrescribeInterventionOptions
): Promise<string> {
  const db = getAdminDb();
  const intervention_id = randomUUID();
  const now = FieldValue.serverTimestamp();

  await db.collection("interventions").doc(intervention_id).set({
    intervention_id,
    user_key: opts.user_key,
    ts: now,
    kind: opts.kind,
    target_dimension: opts.target_dimension,
    source: opts.source,
    content_ref: opts.content_ref,
    triggered_by_measurement: opts.triggered_by_measurement ?? null,
    status: "prescribed" as InterventionStatus,
    status_history: [{ status: "prescribed", ts: now }],
    schema_version: 1,
  });

  return intervention_id;
}

/**
 * Transition an intervention to a new status (viewed / completed / dismissed).
 * Fire-and-forget safe — call without awaiting from UI paths.
 */
export async function updateInterventionStatus(
  intervention_id: string,
  new_status: "viewed" | "completed" | "dismissed"
): Promise<void> {
  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();
  await db.collection("interventions").doc(intervention_id).update({
    status: new_status,
    status_history: FieldValue.arrayUnion({ status: new_status, ts: now }),
  });
}
