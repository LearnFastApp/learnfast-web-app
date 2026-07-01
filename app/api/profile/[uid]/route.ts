import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { DIMS, calculateRank, topDimension } from "@/lib/rank";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const db = getAdminDb();

  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const presenter = presenterSnap.data()!;
  if (!presenter.profileComplete) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [assessmentsSnap, sessionsAgg] = await Promise.all([
    db.collection("ai_assessments")
      .where("presenterId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
    db.collection("sessions").where("presenterId", "==", uid).count().get(),
  ]);

  const assessments = assessmentsSnap.docs.map((d) => d.data());
  const assessmentCount = assessments.length;
  const sessionCount = sessionsAgg.data().count as number;

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

  const rank = calculateRank(sessionCount, avgOverall);
  const top = assessmentCount > 0 ? topDimension(avgScores) : null;

  return NextResponse.json({
    uid,
    displayName:    (presenter.displayName as string)    ?? null,
    jobTitle:       (presenter.jobTitle as string)       ?? null,
    industry:       (presenter.industry as string)       ?? null,
    location:       (presenter.location as string)       ?? null,
    focusDimension: (presenter.focusDimension as string) ?? null,
    profileComplete: true,
    avgScores:      assessmentCount > 0 ? avgScores : null,
    avgOverall:     assessmentCount > 0 ? avgOverall : null,
    assessmentCount,
    sessionCount,
    rank,
    topDimension: top,
  });
}
