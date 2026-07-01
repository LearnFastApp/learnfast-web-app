import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Temporary debug endpoint — returns raw take data to diagnose R2 audioUrl issue
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "lf-debug-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const uid = "zuFmYCIaGLViRSc7LXFwej6wql22";

  const db = getAdminDb();

  // Get the 3 most recent rehearsal sessions
  const sessionsSnap = await db
    .collection("rehearsal_sessions")
    .where("presenterId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(3)
    .get();

  const results = await Promise.all(
    sessionsSnap.docs.map(async (s) => {
      const takesSnap = await s.ref.collection("takes").orderBy("takeNumber", "desc").limit(3).get();
      return {
        sessionId: s.id,
        title: s.data().title,
        isPublic: s.data().isPublic ?? false,
        takes: takesSnap.docs.map((t) => ({
          takeId: t.id,
          takeNumber: t.data().takeNumber,
          status: t.data().status,
          audioUrl: t.data().audioUrl ?? null,
          isPromoted: t.data().isPromoted ?? false,
        })),
      };
    })
  );

  return NextResponse.json({
    r2Configured: !!process.env.R2_ACCESS_KEY_ID,
    r2Bucket: process.env.R2_BUCKET ?? null,
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? null,
    sessions: results,
  });
}
