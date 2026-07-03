import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";
import { calculateRank } from "@/lib/rank";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const PAGE = 20;

  // Fetch public rehearsals belonging to this org (in-memory sort avoids composite index)
  const snap = await db
    .collection("rehearsal_sessions")
    .where("orgId", "==", orgId)
    .where("isPublic", "==", true)
    .limit(100)
    .get();

  const sorted = snap.docs.sort((a, b) => {
    const aDate = a.data().sharedAt ?? "";
    const bDate = b.data().sharedAt ?? "";
    return bDate > aDate ? 1 : bDate < aDate ? -1 : 0;
  });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const startIdx = cursor ? sorted.findIndex((d) => d.data().sharedAt === cursor) + 1 : 0;
  const docs = sorted.slice(startIdx, startIdx + PAGE);
  const hasMore = startIdx + PAGE < sorted.length;

  if (docs.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const presenterIds = [...new Set(docs.map((d) => d.data().presenterId as string))];
  const presenterSnaps = await Promise.all(
    presenterIds.map((id) => db.collection("presenters").doc(id).get()),
  );
  const presenterMap = Object.fromEntries(
    presenterSnaps.map((s) => [s.id, s.data() ?? {}]),
  );

  const items = await Promise.all(
    docs.map(async (doc) => {
      const session = doc.data();
      const presenter = presenterMap[session.presenterId as string] ?? {};

      let featuredTake: Record<string, unknown> | null = null;
      const resolvedTakeId = (session.featuredTakeId ?? session.promotedTakeId) as string | null;

      if (resolvedTakeId) {
        const takeSnap = await doc.ref.collection("takes").doc(resolvedTakeId).get();
        if (takeSnap.exists) featuredTake = { id: takeSnap.id, ...takeSnap.data() };
      }

      if (!featuredTake) {
        const promotedSnap = await doc.ref
          .collection("takes")
          .where("isPromoted", "==", true)
          .orderBy("takeNumber", "desc")
          .limit(1)
          .get();
        if (!promotedSnap.empty) {
          featuredTake = { id: promotedSnap.docs[0].id, ...promotedSnap.docs[0].data() };
        }
      }

      const commentsSnap = await db
        .collection("coaching_comments")
        .where("rehearsalId", "==", doc.id)
        .count()
        .get();
      const commentCount = commentsSnap.data().count as number;

      const sessionCount = (presenter.sessionCount as number) ?? 0;
      const avgScore = featuredTake?.scores
        ? Math.round(
            Object.values(featuredTake.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 5,
          )
        : 0;
      const rank = calculateRank(sessionCount, avgScore);

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
            }
          : null,
        commentCount,
      };
    }),
  );

  return NextResponse.json({
    items,
    nextCursor: hasMore ? docs[docs.length - 1].data().sharedAt : null,
  });
}
