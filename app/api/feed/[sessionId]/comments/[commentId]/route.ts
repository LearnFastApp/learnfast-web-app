import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; commentId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId, commentId } = await params;
  const db = getAdminDb();

  const [commentSnap, sessionSnap] = await Promise.all([
    db.collection("coaching_comments").doc(commentId).get(),
    db.collection("rehearsal_sessions").doc(sessionId).get(),
  ]);

  if (!commentSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const comment = commentSnap.data()!;
  const session = sessionSnap.data();

  const isAuthor = comment.authorId === uid;
  const isRehearsalOwner = session?.presenterId === uid;
  const isAdmin = uid === "zuFmYCIaGLViRSc7LXFwej6wql22";

  if (!isAuthor && !isRehearsalOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.collection("coaching_comments").doc(commentId).delete();
  return NextResponse.json({ ok: true });
}
