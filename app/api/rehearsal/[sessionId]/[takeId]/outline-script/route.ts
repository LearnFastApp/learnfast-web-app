import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { generateOutlineScript, OutlineScriptError } from "@/lib/gameday/outline-script";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; takeId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId, takeId } = await params;
  const db = getAdminDb();

  const sessionRef = db.collection("rehearsal_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists || sessionSnap.data()!.presenterId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const sessionUserLocale = (sessionSnap.data()!.userLocale as string | undefined) ?? "en";
  const sessionContextId = (sessionSnap.data()!.contextId as string | undefined) ?? "general";

  const takeRef = sessionRef.collection("takes").doc(takeId);
  const takeSnap = await takeRef.get();
  if (!takeSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const take = takeSnap.data()!;
  if (take.status !== "complete") {
    return NextResponse.json({ error: "take_not_ready" }, { status: 400 });
  }

  const transcriptText = take.transcriptText as string | undefined;
  if (!transcriptText) {
    return NextResponse.json({ error: "transcript_unavailable" }, { status: 400 });
  }

  const outline = take.suggestedOutline as
    | { throughline: string; sections: { type: string; label: string; content: string }[] }
    | null
    | undefined;

  try {
    const result = await generateOutlineScript({
      transcript: transcriptText,
      throughline: outline?.throughline ?? null,
      sections: outline?.sections ?? null,
      coachingNote: (take.coaching as string) ?? "",
      locale: (take.languageCode as string) ?? "en",
      userLocale: sessionUserLocale,
      contextId: sessionContextId,
    });

    takeRef.update({ generatedScript: result.script }).catch(() => {});

    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[outline-script] Claude failed:",
      err instanceof OutlineScriptError ? err.message : err
    );
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
