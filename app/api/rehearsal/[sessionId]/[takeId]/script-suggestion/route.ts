import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { generateScriptSuggestion } from "@/lib/script-suggestion";

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

  const takeSnap = await sessionRef.collection("takes").doc(takeId).get();
  if (!takeSnap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const take = takeSnap.data()!;
  if (take.status !== "complete") {
    return NextResponse.json({ error: "take_not_ready" }, { status: 400 });
  }

  // Fetch previous takes in this session to extract prior suggestions
  const prevTakesSnap = await sessionRef.collection("takes")
    .where("status", "==", "complete")
    .get();

  const previousSuggestions: string[] = prevTakesSnap.docs
    .filter((d) => d.id !== takeId && d.data().scriptSuggestionSections)
    .sort((a, b) => (a.data().takeNumber ?? 0) - (b.data().takeNumber ?? 0))
    .flatMap((d) =>
      (d.data().scriptSuggestionSections ?? []).map(
        (s: { reason: string }) => s.reason
      )
    );

  // Need the transcript — re-fetch from AssemblyAI if not stored
  const { getTranscription } = await import("@/lib/assemblyai-client");
  let transcriptText = take.transcriptText as string | undefined;

  if (!transcriptText && take.assemblyAiId) {
    try {
      const transcript = await getTranscription(take.assemblyAiId as string);
      transcriptText = transcript.text ?? "";
    } catch {
      return NextResponse.json({ error: "transcript_unavailable" }, { status: 500 });
    }
  }

  if (!transcriptText) {
    return NextResponse.json({ error: "transcript_unavailable" }, { status: 400 });
  }

  try {
    const suggestion = await generateScriptSuggestion({
      transcript: transcriptText,
      scores: take.scores as Record<string, number>,
      coachingNote: (take.coaching as string) ?? "",
      nextFocus: (take.nextFocus as string[]) ?? [],
      takeNumber: take.takeNumber as number,
      locale: (take.languageCode as string) ?? "en",
      userLocale: sessionUserLocale,
      contextId: sessionContextId,
      previousSuggestions,
    });

    // Store sections on the take so future takes can avoid repeating them
    takeSnap.ref.update({
      scriptSuggestionSections: suggestion.sections,
    }).catch(() => {});

    return NextResponse.json(suggestion);
  } catch (err) {
    console.error("[script-suggestion] Claude failed:", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
