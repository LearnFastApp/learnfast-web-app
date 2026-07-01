import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const db = getAdminDb();

  const snap = await db
    .collection("coaching_comments")
    .where("rehearsalId", "==", sessionId)
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  const comments = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      authorId: data.authorId,
      authorName: data.authorName,
      authorRank: data.authorRank,
      dimension: data.dimension ?? null,
      comment: data.comment,
      reaction: data.reaction ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = getAdminDb();

  // Verify the session is public
  const sessionSnap = await db.collection("rehearsal_sessions").doc(sessionId).get();
  if (!sessionSnap.exists || !sessionSnap.data()!.isPublic) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json() as {
    comment?: string;
    dimension?: string | null;
    reaction?: string | null;
  };

  if (!body.comment?.trim() && !body.reaction) {
    return NextResponse.json({ error: "comment or reaction required" }, { status: 400 });
  }
  if (body.comment && body.comment.trim().length > 500) {
    return NextResponse.json({ error: "comment too long" }, { status: 400 });
  }

  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const presenter = presenterSnap.data() ?? {};

  const commentRef = db.collection("coaching_comments").doc();
  const now = Timestamp.fromDate(new Date());

  await commentRef.set({
    rehearsalId: sessionId,
    authorId: uid,
    authorName: (presenter.displayName as string) ?? "Anonymous",
    authorRank: presenter.rank ?? null,
    dimension: body.dimension ?? null,
    comment: body.comment?.trim() ?? null,
    reaction: body.reaction ?? null,
    createdAt: now,
  });

  return NextResponse.json({
    id: commentRef.id,
    authorId: uid,
    authorName: (presenter.displayName as string) ?? "Anonymous",
    dimension: body.dimension ?? null,
    comment: body.comment?.trim() ?? null,
    reaction: body.reaction ?? null,
    createdAt: now.toDate().toISOString(),
  });
}
