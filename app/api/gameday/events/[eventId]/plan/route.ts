import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { generatePlan } from "@/lib/gameday/plan-engine";
import { buildPlanDocument } from "@/lib/gameday/plan-version";
import { reanchorSprintPlan, carryOverCompletedSessions } from "@/lib/gameday/reanchor";
import type { PrescribedSessionRecord } from "@/lib/gameday/types";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

/**
 * Fetches the current plan for an event, re-anchoring a sprint plan onto a
 * shorter template first if missed days have moved the user past a template
 * boundary (spec §4.4: silent regeneration, "Plan adjusted" copy, never
 * "you missed a session"). Block-mode plans are never re-anchored here —
 * their sessions are ordinal, not date-locked (see reanchor.ts).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const db = getAdminDb();

  const eventSnap = await db.collection("speakingEvents").doc(eventId).get();
  if (!eventSnap.exists || eventSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const eventData = eventSnap.data()!;
  const eventDate = eventData.eventDate.toDate() as Date;

  const currentPlanSnap = await db
    .collection("plans")
    .where("eventId", "==", eventId)
    .where("isCurrent", "==", true)
    .limit(1)
    .get();
  if (currentPlanSnap.empty) {
    return NextResponse.json({ error: "no_plan" }, { status: 404 });
  }
  const currentPlanDoc = currentPlanSnap.docs[0];
  const currentPlan = currentPlanDoc.data();

  const sessionsSnap = await db
    .collection("prescribedSessions")
    .where("planId", "==", currentPlanDoc.id)
    .orderBy("ordinal", "asc")
    .get();
  const sessionRecords: PrescribedSessionRecord[] = sessionsSnap.docs.map((d) => ({
    sessionType: d.data().sessionType,
    status: d.data().status,
    ordinal: d.data().ordinal,
    dayIndex: d.data().dayIndex ?? undefined,
  }));

  const now = new Date();
  const reanchorResult = reanchorSprintPlan({
    currentPlan: { mode: currentPlan.mode, sprintTemplateKey: currentPlan.sprintTemplateKey ?? null },
    prescribedSessions: sessionRecords,
    eventDate,
    now,
  });

  if (!reanchorResult.needsRegeneration) {
    return NextResponse.json({
      plan: { id: currentPlanDoc.id, ...currentPlan },
      prescribedSessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      reanchored: false,
    });
  }

  // Regenerate onto the new (shorter) template, carrying over completed work.
  const freshPlan = generatePlan({ eventDate, now });
  const mergedSeeds =
    freshPlan.mode === "sprint" && freshPlan.days
      ? (() => {
          const carryOverSeeds = carryOverCompletedSessions(sessionRecords, freshPlan.days!);
          return freshPlan.sessionSeeds.map((seed, i) => ({ ...seed, status: carryOverSeeds[i]?.status }));
        })()
      : freshPlan.sessionSeeds;

  const nowTs = Timestamp.fromDate(now);
  const newPlanRef = db.collection("plans").doc();
  const newPlanDoc = buildPlanDocument(
    { ...freshPlan, sessionSeeds: mergedSeeds },
    { eventId, userId: uid, prevPlanVersion: currentPlan.planVersion }
  );

  await db.runTransaction(async (tx) => {
    tx.update(currentPlanDoc.ref, { isCurrent: false });
    tx.set(newPlanRef, { ...newPlanDoc, generatedAt: nowTs });
  });

  const batch = db.batch();
  for (const seed of mergedSeeds) {
    const sessionRef = db.collection("prescribedSessions").doc();
    batch.set(sessionRef, {
      planId: newPlanRef.id,
      eventId,
      userId: uid,
      phaseType: seed.phaseType ?? null,
      dayIndex: seed.dayIndex ?? null,
      sessionType: seed.sessionType,
      ordinal: seed.ordinal,
      targetDate: seed.targetDate ? Timestamp.fromDate(new Date(seed.targetDate)) : null,
      focusDimension: seed.focusDimension ?? null,
      constraint: seed.constraint ?? null,
      status: seed.status ?? "scheduled",
      completedRehearsalSessionId: null,
      completedTakeId: null,
      completedAt: null,
    });
  }
  await batch.commit();

  const user_key = await getOrCreateUserKey(uid);
  logEvent("gameday.plan_reanchored", {
    user_key,
    payload: {
      eventId,
      planId: newPlanRef.id,
      fromTemplateKey: currentPlan.sprintTemplateKey ?? null,
      toTemplateKey: reanchorResult.newTemplateKey ?? null,
    },
  });

  const newSessionsSnap = await db
    .collection("prescribedSessions")
    .where("planId", "==", newPlanRef.id)
    .orderBy("ordinal", "asc")
    .get();

  return NextResponse.json({
    plan: { id: newPlanRef.id, ...newPlanDoc, generatedAt: nowTs.toDate().toISOString() },
    prescribedSessions: newSessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    reanchored: true,
  });
}
