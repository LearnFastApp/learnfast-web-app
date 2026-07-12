import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import { generateAndSaveCueCard, saveManualCueCard } from "@/lib/gameday/generate-cue-card";
import { getOrCreateUserKey } from "@/lib/user-key";

export const dynamic = "force-dynamic";

/**
 * Manual cue-card generation trigger (also fired automatically after a
 * highest-scoring fullrun — see app/api/rehearsal/[sessionId]/[takeId]).
 * On extraction failure, returns a handled 200 with {error:"extraction_failed"}
 * — not a 500 — so the client renders the manual-edit fallback UI instead of
 * a hard error (spec §2/§4: "manual-edit fallback UI if the call fails").
 */
export async function POST(req: NextRequest) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let planId: string;
  let rehearsalSessionId: string;
  let takeId: string;
  let manualLines: string[] | null;
  try {
    const body = await req.json();
    planId = String(body.planId ?? "");
    rehearsalSessionId = String(body.rehearsalSessionId ?? "");
    takeId = String(body.takeId ?? "");
    manualLines = Array.isArray(body.manualLines) ? body.manualLines : null;

    if (!planId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (!manualLines && (!rehearsalSessionId || !takeId)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (
      manualLines &&
      (manualLines.length !== 5 || manualLines.some((l) => typeof l !== "string" || !l.trim()))
    ) {
      return NextResponse.json({ error: "invalid_lines" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();

  if (manualLines) {
    const planSnap = await db.collection("plans").doc(planId).get();
    if (!planSnap.exists || planSnap.data()?.userId !== uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const user_key = await getOrCreateUserKey(uid);
    const result = await saveManualCueCard({ planId, userId: uid, lines: manualLines, user_key });
    return NextResponse.json(result);
  }

  const [planSnap, sessionSnap, takeSnap] = await Promise.all([
    db.collection("plans").doc(planId).get(),
    db.collection("rehearsal_sessions").doc(rehearsalSessionId).get(),
    db.collection("rehearsal_sessions").doc(rehearsalSessionId).collection("takes").doc(takeId).get(),
  ]);

  if (!planSnap.exists || planSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!sessionSnap.exists || sessionSnap.data()?.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const transcriptText = takeSnap.data()?.transcriptText as string | undefined;
  if (!takeSnap.exists || takeSnap.data()?.status !== "complete" || !transcriptText) {
    return NextResponse.json({ error: "take_not_ready" }, { status: 400 });
  }

  const userLocale = (sessionSnap.data()?.userLocale as string | undefined) ?? "en";
  const user_key = await getOrCreateUserKey(uid);

  const result = await generateAndSaveCueCard({
    planId,
    userId: uid,
    rehearsalSessionId,
    takeId,
    transcriptText,
    locale: userLocale,
    user_key,
  });

  if ("error" in result) {
    return NextResponse.json(result);
  }
  return NextResponse.json(result);
}
