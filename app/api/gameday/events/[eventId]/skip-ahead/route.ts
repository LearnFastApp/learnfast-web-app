import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { skipRemainingPrescribedSessions } from "@/lib/gameday/skip-ahead";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

/**
 * "I'm happy with this, skip to Cue Card" — marks the plan's remaining
 * scheduled sessions as skipped so the roadmap/timeline honestly reflect that
 * the user moved on, instead of the plan silently going stale while they use
 * the always-available Warm-Up manual-entry path anyway.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
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

  const currentPlanSnap = await db
    .collection("plans")
    .where("eventId", "==", eventId)
    .where("isCurrent", "==", true)
    .limit(1)
    .get();
  if (currentPlanSnap.empty) {
    return NextResponse.json({ error: "no_plan" }, { status: 404 });
  }
  const planId = currentPlanSnap.docs[0].id;

  const { skippedCount } = await skipRemainingPrescribedSessions({ planId, userId: uid });

  const user_key = await getOrCreateUserKey(uid);
  logEvent("gameday.plan_skipped_ahead", {
    user_key,
    payload: { eventId, planId, skippedCount },
  });

  return NextResponse.json({ skippedCount });
}
