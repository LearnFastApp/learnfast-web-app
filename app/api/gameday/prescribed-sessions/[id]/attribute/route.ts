import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { completePrescribedSession } from "@/lib/gameday/complete-prescribed-session";
import { logEvent } from "@/lib/telemetry";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

/**
 * Free-session attribution (spec §5, mandatory): a rep recorded through the
 * normal free flow while a plan session is pending gets linked in on request
 * — "a user must never do a rep and feel it didn't count toward their plan."
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: prescribedSessionId } = await params;

  let rehearsalSessionId: string;
  let takeId: string;
  try {
    const body = await req.json();
    rehearsalSessionId = String(body.rehearsalSessionId ?? "");
    takeId = String(body.takeId ?? "");
    if (!rehearsalSessionId || !takeId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();

  const [prescribedSnap, rehearsalSnap, takeSnap] = await Promise.all([
    db.collection("prescribedSessions").doc(prescribedSessionId).get(),
    db.collection("rehearsal_sessions").doc(rehearsalSessionId).get(),
    db.collection("rehearsal_sessions").doc(rehearsalSessionId).collection("takes").doc(takeId).get(),
  ]);

  if (!prescribedSnap.exists || prescribedSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!rehearsalSnap.exists || rehearsalSnap.data()?.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!takeSnap.exists || takeSnap.data()?.status !== "complete") {
    return NextResponse.json({ error: "take_not_complete" }, { status: 400 });
  }
  if (prescribedSnap.data()?.status === "completed") {
    return NextResponse.json({ error: "already_completed" }, { status: 400 });
  }

  await completePrescribedSession({ prescribedSessionId, rehearsalSessionId, takeId, userId: uid });

  const user_key = await getOrCreateUserKey(uid);
  logEvent("gameday.prescribed_session_completed", {
    user_key,
    payload: {
      prescribedSessionId,
      planId: prescribedSnap.data()?.planId ?? null,
      sessionType: prescribedSnap.data()?.sessionType ?? null,
      wasFreeAttribution: true,
    },
  });

  return NextResponse.json({ prescribedSessionId, status: "completed" });
}
