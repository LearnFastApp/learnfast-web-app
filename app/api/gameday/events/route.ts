import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { generatePlan } from "@/lib/gameday/plan-engine";
import { buildPlanDocument } from "@/lib/gameday/plan-version";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

const MIN_SESSIONS_PER_WEEK = 2;
const MAX_SESSIONS_PER_WEEK = 5;

export async function POST(req: NextRequest) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let title: string;
  let eventDateRaw: string;
  let contextType: string;
  let sessionsPerWeek: number | undefined;

  try {
    const body = await req.json();
    title = String(body.title ?? "").trim();
    eventDateRaw = String(body.eventDate ?? "");
    contextType = (String(body.contextType ?? "general").trim() || "general");
    sessionsPerWeek = body.sessionsPerWeek != null ? Number(body.sessionsPerWeek) : undefined;

    if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });
    if (
      sessionsPerWeek != null &&
      (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < MIN_SESSIONS_PER_WEEK || sessionsPerWeek > MAX_SESSIONS_PER_WEEK)
    ) {
      return NextResponse.json({ error: "invalid_sessions_per_week" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const eventDate = new Date(eventDateRaw);
  const now = new Date();
  if (Number.isNaN(eventDate.getTime()) || eventDate.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const plan = generatePlan({ eventDate, now, sessionsPerWeek });

  // Per spec: event < 4 hours away skips planning entirely — no speakingEvent
  // or plan is created. The client routes straight to cue-card quick entry +
  // Warm-Up (Phase D) instead of calling this route in that case; this is a
  // defensive re-check in case the client's own classification is stale.
  if (plan.mode === "immediate") {
    return NextResponse.json({ mode: "immediate" });
  }

  const db = getAdminDb();
  const nowTs = Timestamp.fromDate(now);
  const eventRef = db.collection("speakingEvents").doc();

  // Sprint interrupt (spec §8): a new nearer sprint/emergency plan auto-pauses
  // any existing active BLOCK-mode plan. Max concurrency: one active block +
  // one active sprint, so at most one block is paused here.
  let pausedEventId: string | null = null;
  if (plan.mode === "sprint" || plan.mode === "emergency") {
    const activeSnap = await db
      .collection("speakingEvents")
      .where("userId", "==", uid)
      .where("status", "==", "active")
      .get();

    for (const existing of activeSnap.docs) {
      const currentPlanSnap = await db
        .collection("plans")
        .where("eventId", "==", existing.id)
        .where("isCurrent", "==", true)
        .limit(1)
        .get();
      const currentPlan = currentPlanSnap.docs[0]?.data();
      if (currentPlan?.mode === "block") {
        await existing.ref.update({ status: "paused", pausedForEventId: eventRef.id });
        pausedEventId = existing.id;
        break;
      }
    }
  }

  await eventRef.set({
    userId: uid,
    title,
    eventDate: Timestamp.fromDate(eventDate),
    contextType,
    status: "active",
    createdAt: nowTs,
    pausedForEventId: null,
  });

  const planRef = db.collection("plans").doc();
  const planDoc = buildPlanDocument(plan, { eventId: eventRef.id, userId: uid });
  await planRef.set({ ...planDoc, generatedAt: nowTs });

  // Note: prescribedSessions count is bounded by Firestore's 500-op batch
  // limit. Not a concern for any runway band in the spec's own acceptance
  // matrix; an unrealistically distant event date (years out) could exceed
  // it — not handled here, flagged as a known v1 limitation.
  const batch = db.batch();
  for (const seed of plan.sessionSeeds) {
    const sessionRef = db.collection("prescribedSessions").doc();
    batch.set(sessionRef, {
      planId: planRef.id,
      eventId: eventRef.id,
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
  logEvent("gameday.plan_generated", {
    user_key,
    payload: { eventId: eventRef.id, planId: planRef.id, mode: plan.mode, runwayDays: plan.runwayDays },
  });

  return NextResponse.json({
    eventId: eventRef.id,
    planId: planRef.id,
    mode: plan.mode,
    runwayDays: plan.runwayDays,
    pausedEventId,
  });
}
