import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { getActiveScoringVersionRef } from "./scoring-version";

export type MeasurementKind =
  | "ai_assessment"
  | "rehearsal_take"
  | "live_session"
  | "audience_aggregate"
  | "self_reflection";

export interface MeasurementContext {
  assessment_type?: string;
  setting?: "board" | "staff_room" | "squad" | "course" | "other" | "unknown";
  audience_size?: number | null;
  duration_seconds: number;
  locale: string;
  take_number?: number | null;
  assignment_ref?: string | null;
}

export interface MeasurementScores {
  clarity: number;
  energy: number;
  engagement: number;
  understanding: number;
  connection: number;
}

export interface WriteMeasurementOptions {
  user_key: string;
  org_id?: string | null;
  kind: MeasurementKind;
  context: MeasurementContext;
  scores: MeasurementScores;
  archetype?: string | null;
  signal: "ai" | "audience" | "self";
  raw_ref?: string | null;
  backfilled?: boolean;
  override_scoring_version?: string;
}

/**
 * Write a scored performance record to the measurements collection.
 *
 * sequence_index is computed atomically at write time using Firestore count()
 * so longitudinal queries can always trust ordering without reconstructing it.
 *
 * Returns the measurement_id.
 */
export async function writeMeasurement(opts: WriteMeasurementOptions): Promise<string> {
  const db = getAdminDb();
  const measurement_id = randomUUID();

  // Atomic sequence number — nth measurement of this kind for this user_key
  const countSnap = await db
    .collection("measurements")
    .where("user_key", "==", opts.user_key)
    .where("kind", "==", opts.kind)
    .count()
    .get();
  const sequence_index = countSnap.data().count + 1;

  const composite = Math.round(
    (opts.scores.clarity +
      opts.scores.energy +
      opts.scores.engagement +
      opts.scores.understanding +
      opts.scores.connection) /
      5
  );

  const scoring_version_ref =
    opts.override_scoring_version ?? (await getActiveScoringVersionRef());

  const doc = {
    measurement_id,
    user_key: opts.user_key,
    org_id: opts.org_id ?? null,
    kind: opts.kind,
    ts: FieldValue.serverTimestamp(),
    context: opts.context,
    scores: { ...opts.scores, composite },
    archetype: opts.archetype ?? null,
    scoring_version_ref,
    signal: opts.signal,
    raw_ref: opts.raw_ref ?? null,
    sequence_index,
    backfilled: opts.backfilled ?? false,
    schema_version: 1,
  };

  await db.collection("measurements").doc(measurement_id).set(doc);
  return measurement_id;
}
