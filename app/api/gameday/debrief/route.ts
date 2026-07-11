import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

/**
 * Marks a speakingEvent debriefed/completed. If this event was a sprint that
 * had auto-paused a block (spec §8 sprint interrupt), resumes that block now.
 * Ordinal sessions simply roll forward from here — block mode has no v1
 * re-anchor algorithm (undone sessions stay "next" regardless of elapsed
 * time); this is a deliberate v1 simplification, not an oversight.
 */
export async function POST(req: NextRequest) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let eventId: string;
  try {
    const body = await req.json();
    eventId = String(body.eventId ?? "");
    if (!eventId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();
  const eventRef = db.collection("speakingEvents").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists || eventSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await eventRef.update({ status: "completed" });

  let resumedEventId: string | null = null;
  const pausedSnap = await db
    .collection("speakingEvents")
    .where("userId", "==", uid)
    .where("pausedForEventId", "==", eventId)
    .limit(1)
    .get();
  if (!pausedSnap.empty) {
    const pausedDoc = pausedSnap.docs[0];
    await pausedDoc.ref.update({ status: "active", pausedForEventId: null });
    resumedEventId = pausedDoc.id;
  }

  const user_key = await getOrCreateUserKey(uid);
  logEvent("gameday.debrief_completed", { user_key, payload: { eventId, resumedEventId } });

  return NextResponse.json({ eventId, status: "completed", resumedEventId });
}
