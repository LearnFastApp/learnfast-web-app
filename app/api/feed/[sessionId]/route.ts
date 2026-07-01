import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { calculateRank } from "@/lib/rank";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const db = getAdminDb();

  const sessionSnap = await db.collection("rehearsal_sessions").doc(sessionId).get();
  if (!sessionSnap.exists || !sessionSnap.data()!.isPublic) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = sessionSnap.data()!;

  const [presenterSnap, commentsAgg] = await Promise.all([
    db.collection("presenters").doc(session.presenterId as string).get(),
    db.collection("coaching_comments").where("rehearsalId", "==", sessionId).count().get(),
  ]);

  const presenter = presenterSnap.data() ?? {};

  // Resolve featured take — explicit override first, then promoted, then latest complete
  let featuredTake: Record<string, unknown> | null = null;
  const featuredTakeId = session.featuredTakeId as string | null;

  if (featuredTakeId) {
    const snap = await sessionSnap.ref.collection("takes").doc(featuredTakeId).get();
    if (snap.exists) featuredTake = { id: snap.id, ...snap.data() };
  }

  if (!featuredTake) {
    const promotedSnap = await sessionSnap.ref
      .collection("takes")
      .where("isPromoted", "==", true)
      .limit(1)
      .get();
    if (!promotedSnap.empty) {
      featuredTake = { id: promotedSnap.docs[0].id, ...promotedSnap.docs[0].data() };
    }
  }

  if (!featuredTake) {
    // Fall back to any complete take
    const anySnap = await sessionSnap.ref
      .collection("takes")
      .where("status", "==", "complete")
      .limit(1)
      .get();
    if (!anySnap.empty) {
      featuredTake = { id: anySnap.docs[0].id, ...anySnap.docs[0].data() };
    }
  }

  const avgScore = featuredTake?.scores
    ? Math.round(
        Object.values(featuredTake.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 5
      )
    : 0;

  const rank = calculateRank(
    (presenter.sessionCount as number) ?? 0,
    avgScore
  );

  return NextResponse.json({
    id: sessionSnap.id,
    title: session.title ?? "Untitled",
    tags: session.tags ?? [],
    sharedAt: session.sharedAt ?? null,
    presenterId: session.presenterId,
    presenterName: (presenter.displayName as string) ?? null,
    presenterJobTitle: (presenter.jobTitle as string) ?? null,
    presenterIndustry: (presenter.industry as string) ?? null,
    rank,
    featuredTake: featuredTake
      ? {
          id: featuredTake.id,
          audioUrl: (featuredTake.audioUrl as string) ?? null,
          scores: (featuredTake.scores as Record<string, number>) ?? null,
          audioDurationSeconds: (featuredTake.audioDurationSeconds as number) ?? null,
          wordsPerMinute: (featuredTake.wordsPerMinute as number) ?? null,
          fillerWordCount: (featuredTake.fillerWordCount as number) ?? null,
          strength: (featuredTake.strength as string) ?? null,
          coaching: (featuredTake.coaching as string) ?? null,
          nextFocus: (featuredTake.nextFocus as string[]) ?? null,
          encouragement: (featuredTake.encouragement as string) ?? null,
        }
      : null,
    commentCount: commentsAgg.data().count as number,
  });
}
