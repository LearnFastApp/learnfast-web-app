import { getAdminDb } from "./firebase-admin";

export interface OutcomeMeasurement {
  measurement_id: string;
  ts: Date;
  sequence_index: number;
  kind: string;
  scores: Record<string, number>;
  delta: Record<string, number> | null;
}

export interface OutcomeWindow {
  intervention_id: string;
  user_key: string;
  intervention_ts: Date;
  target_dimension: string;
  baseline_scores: Record<string, number> | null;
  measurements: OutcomeMeasurement[];
}

/**
 * Returns the n measurements that followed a given intervention for the same user_key.
 *
 * This proves the schema join works end-to-end — no separate outcomes collection needed.
 * The linkage is queryable by construction via sequence_index + ts.
 *
 * Reference implementation per LEARNFAST_DATA_FOUNDATION_SPEC §4.7.
 */
export async function getInterventionOutcomeWindow(
  intervention_id: string,
  n_measurements = 3
): Promise<OutcomeWindow | null> {
  const db = getAdminDb();

  const interventionSnap = await db.collection("interventions").doc(intervention_id).get();
  if (!interventionSnap.exists) return null;

  const intervention = interventionSnap.data()!;
  const { user_key, target_dimension, ts: intervention_ts, triggered_by_measurement } = intervention;

  // Baseline: the measurement that triggered this intervention
  let baseline_scores: Record<string, number> | null = null;
  if (triggered_by_measurement) {
    const baseId = (triggered_by_measurement as string).split("/").pop()!;
    const baseSnap = await db.collection("measurements").doc(baseId).get();
    if (baseSnap.exists) {
      baseline_scores = baseSnap.data()!.scores as Record<string, number>;
    }
  }

  // Subsequent measurements for this user, ordered by time
  const measurementsSnap = await db
    .collection("measurements")
    .where("user_key", "==", user_key)
    .where("ts", ">", intervention_ts)
    .orderBy("ts", "asc")
    .limit(n_measurements)
    .get();

  const measurements: OutcomeMeasurement[] = measurementsSnap.docs.map((doc) => {
    const data = doc.data();
    const scores = data.scores as Record<string, number>;
    const delta = baseline_scores
      ? Object.fromEntries(
          Object.entries(scores).map(([dim, val]) => [
            dim,
            Math.round(val - (baseline_scores![dim] ?? 0)),
          ])
        )
      : null;
    return {
      measurement_id: data.measurement_id as string,
      ts: data.ts?.toDate?.() ?? new Date(0),
      sequence_index: data.sequence_index as number,
      kind: data.kind as string,
      scores,
      delta,
    };
  });

  return {
    intervention_id,
    user_key: user_key as string,
    intervention_ts: intervention_ts?.toDate?.() ?? new Date(0),
    target_dimension: target_dimension as string,
    baseline_scores,
    measurements,
  };
}
