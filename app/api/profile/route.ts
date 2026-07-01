import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { DIMS, calculateRank, topDimension } from "@/lib/rank";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();

  const [presenterSnap, assessmentsSnap] = await Promise.all([
    db.collection("presenters").doc(uid).get(),
    db.collection("ai_assessments")
      .where("presenterId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
  ]);

  const presenter = presenterSnap.data() ?? {};
  const assessments = assessmentsSnap.docs.map((d) => d.data());
  const assessmentCount = assessments.length;

  const avgScores: Record<string, number> = {};
  if (assessmentCount > 0) {
    for (const dim of DIMS) {
      const values = assessments
        .map((a) => (a.scores as Record<string, number> | null)?.[dim])
        .filter((v): v is number => typeof v === "number");
      if (values.length > 0) {
        avgScores[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
    }
  }

  const avgOverall =
    assessmentCount > 0 && Object.keys(avgScores).length === DIMS.length
      ? Math.round(Object.values(avgScores).reduce((a, b) => a + b, 0) / DIMS.length)
      : 0;

  // Count live sessions
  const sessionsSnap = await db
    .collection("sessions")
    .where("presenterId", "==", uid)
    .count()
    .get();
  const sessionCount = sessionsSnap.data().count as number;

  const rank = calculateRank(sessionCount, avgOverall);
  const top = assessmentCount > 0 ? topDimension(avgScores) : null;

  return NextResponse.json({
    displayName:     (presenter.displayName as string)     ?? null,
    jobTitle:        (presenter.jobTitle as string)        ?? null,
    industry:        (presenter.industry as string)        ?? null,
    location:        (presenter.location as string)        ?? null,
    focusDimension:  (presenter.focusDimension as string)  ?? null,
    profileComplete: (presenter.profileComplete as boolean) ?? false,
    avgScores:       assessmentCount > 0 ? avgScores : null,
    avgOverall:      assessmentCount > 0 ? avgOverall : null,
    assessmentCount,
    sessionCount,
    rank,
    topDimension:    top,
  });
}

export async function PATCH(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const allowed = ["displayName", "jobTitle", "industry", "location", "focusDimension"];
  const update: Record<string, unknown> = { profileComplete: true };

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const db = getAdminDb();
  await db.collection("presenters").doc(uid).set(update, { merge: true });

  return NextResponse.json({ ok: true });
}
