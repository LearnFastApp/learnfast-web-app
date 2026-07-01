import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { calculateRank } from "@/lib/rank";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dimension = searchParams.get("dim");
  const cursor = searchParams.get("cursor");
  const PAGE = 20;

  const db = getAdminDb();

  let query = db
    .collection("rehearsal_sessions")
    .where("isPublic", "==", true)
    .orderBy("sharedAt", "desc")
    .limit(PAGE + 1);

  if (cursor) query = query.startAfter(cursor);

  const snap = await query.get();
  const docs = snap.docs.slice(0, PAGE);
  const hasMore = snap.docs.length > PAGE;

  const presenterIds = [...new Set(docs.map((d) => d.data().presenterId as string))];
  const presenterSnaps = await Promise.all(
    presenterIds.map((id) => db.collection("presenters").doc(id).get())
  );
  const presenterMap = Object.fromEntries(
    presenterSnaps.map((s) => [s.id, s.data() ?? {}])
  );

  const items = await Promise.all(
    docs.map(async (doc) => {
      const session = doc.data();
      const presenter = presenterMap[session.presenterId as string] ?? {};

      // Fetch the featured take's scores
      let featuredTake: Record<string, unknown> | null = null;
      const featuredTakeId = session.featuredTakeId as string | null;

      if (featuredTakeId) {
        const takeSnap = await doc.ref.collection("takes").doc(featuredTakeId).get();
        if (takeSnap.exists) featuredTake = { id: takeSnap.id, ...takeSnap.data() };
      } else {
        // Fall back to the promoted take
        const promotedSnap = await doc.ref
          .collection("takes")
          .where("isPromoted", "==", true)
          .limit(1)
          .get();
        if (!promotedSnap.empty) {
          featuredTake = { id: promotedSnap.docs[0].id, ...promotedSnap.docs[0].data() };
        }
      }

      // Get comment count
      const commentsSnap = await db
        .collection("coaching_comments")
        .where("rehearsalId", "==", doc.id)
        .count()
        .get();
      const commentCount = commentsSnap.data().count as number;

      const sessionCount = (presenter.sessionCount as number) ?? 0;
      const avgScore = featuredTake?.scores
        ? Math.round(
            Object.values(featuredTake.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 5
          )
        : 0;
      const rank = calculateRank(sessionCount, avgScore);

      // Filter by dimension if requested
      if (dimension && featuredTake?.scores) {
        const scores = featuredTake.scores as Record<string, number>;
        if (!scores[dimension]) return null;
      }

      return {
        id: doc.id,
        title: session.title ?? "Untitled",
        tags: session.tags ?? [],
        sharedAt: session.sharedAt,
        presenterId: session.presenterId,
        presenterName: presenter.displayName ?? null,
        presenterJobTitle: presenter.jobTitle ?? null,
        presenterIndustry: presenter.industry ?? null,
        rank,
        featuredTake: featuredTake
          ? {
              id: featuredTake.id,
              audioUrl: featuredTake.audioUrl ?? null,
              scores: featuredTake.scores ?? null,
              audioDurationSeconds: featuredTake.audioDurationSeconds ?? null,
              wordsPerMinute: featuredTake.wordsPerMinute ?? null,
              strength: featuredTake.strength ?? null,
              coaching: featuredTake.coaching ?? null,
              nextFocus: featuredTake.nextFocus ?? null,
              encouragement: featuredTake.encouragement ?? null,
            }
          : null,
        commentCount,
      };
    })
  );

  const filtered = items.filter(Boolean);

  return NextResponse.json({
    items: filtered,
    nextCursor: hasMore ? docs[docs.length - 1].data().sharedAt : null,
  });
}
