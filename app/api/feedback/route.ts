import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

const DIMS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;

export async function POST(req: NextRequest) {
  // Rate limit: 5 submissions per IP per 10 minutes
  const ip = getIp(req);
  const { allowed } = rateLimit(`feedback:${ip}`, 5, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before trying again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { sessionId, scores, comment, anonymous, commenterName, selectedPresenterId } = body as {
      sessionId: string;
      scores: Record<string, number>;
      comment?: string;
      anonymous?: boolean;
      commenterName?: string;
      selectedPresenterId?: string;
    };

    if (!sessionId || !scores) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate scores are numbers in range 0–100
    for (const dim of DIMS) {
      const val = scores[dim];
      if (typeof val !== "number" || val < 0 || val > 100) {
        return NextResponse.json({ error: "Invalid score values" }, { status: 400 });
      }
    }

    const db = getAdminDb();

    // Verify session exists and is still active
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (sessionDoc.data()?.status === "closed") {
      return NextResponse.json({ error: "Session is closed" }, { status: 410 });
    }

    // Resolve presenter: use provided value, fall back to session's own presenterId
    const resolvedPresenterId =
      selectedPresenterId?.trim() || (sessionDoc.data()?.presenterId as string | undefined) || null;

    const anonId = crypto.randomUUID();

    await db.collection("feedback_responses").add({
      sessionId,
      ...scores,
      selectedPresenterId: resolvedPresenterId,
      submittedAt: FieldValue.serverTimestamp(),
      anonId,
      ...(comment?.trim()
        ? {
            comment: comment.trim(),
            anonymous: anonymous ?? true,
            commenterName: anonymous ? null : (commenterName?.trim() || null),
          }
        : {}),
    });

    // Log to canonical event spine — audience member is anonymous, log against session
    logEvent("measurement.audience_score_submitted", {
      context: { surface: "web", source: "audience_loop" },
      payload: {
        session_id: sessionId,
        presenter_id: resolvedPresenterId,
        scores,
        has_comment: !!(comment?.trim()),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
