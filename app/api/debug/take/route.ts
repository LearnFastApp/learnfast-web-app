import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { uploadTakeAudio } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "lf-debug-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const uid = "zuFmYCIaGLViRSc7LXFwej6wql22";

  // Direct R2 test — upload a tiny file and report the result
  let r2TestUrl: string | null = null;
  let r2TestError: string | null = null;
  try {
    r2TestUrl = await uploadTakeAudio("debug-test-file", Buffer.from("learnfast-r2-test"), "text/plain");
  } catch (err) {
    r2TestError = err instanceof Error ? err.message : String(err);
  }

  const db = getAdminDb();

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
          r2Error: t.data().r2Error ?? null,
          isPromoted: t.data().isPromoted ?? false,
        })),
      };
    })
  );

  return NextResponse.json({
    r2TestUrl,
    r2TestError,
    r2Configured: !!process.env.R2_ACCESS_KEY_ID,
    r2Bucket: process.env.R2_BUCKET ?? null,
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? null,
    sessions: results,
  });
}
