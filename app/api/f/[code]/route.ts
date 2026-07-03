import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

// Window: 15 min before scheduledStart → 60 min after scheduledEnd, or status === 'live'
function isInFeedbackWindow(
  status: string,
  scheduledStart: FirebaseFirestore.Timestamp,
  scheduledEnd: FirebaseFirestore.Timestamp,
): boolean {
  if (status === "live") return true;
  if (status === "completed" || status === "cancelled") return false;
  const now = Date.now();
  const start = scheduledStart.toMillis() - 15 * 60 * 1000;
  const end = scheduledEnd.toMillis() + 60 * 60 * 1000;
  return now >= start && now <= end;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const db = getAdminDb();
  const codeDoc = await db.collection("session_feedback_codes").doc(code.toUpperCase()).get();
  if (!codeDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { orgId, sessionId, consumerCode } = codeDoc.data() as {
    orgId: string;
    sessionId: string;
    consumerCode?: string;
  };

  const [sessionDoc, orgDoc] = await Promise.all([
    db.doc(`organizations/${orgId}/sessions/${sessionId}`).get(),
    db.doc(`organizations/${orgId}`).get(),
  ]);

  if (!sessionDoc.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = sessionDoc.data()!;
  const org = orgDoc.data();
  const inWindow = isInFeedbackWindow(session.status, session.scheduledStart, session.scheduledEnd);

  return NextResponse.json({
    sessionId,
    orgId,
    title: session.title,
    type: session.type,
    orgName: org?.name ?? null,
    status: session.status,
    inWindow,
    consumerCode: consumerCode ?? session.linkedConsumerCode ?? null,
    scheduledStart: session.scheduledStart?.toDate?.()?.toISOString() ?? null,
    scheduledEnd: session.scheduledEnd?.toDate?.()?.toISOString() ?? null,
  });
}
