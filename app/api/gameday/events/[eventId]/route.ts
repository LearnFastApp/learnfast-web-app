import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { isGamedayModeEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["cancelled", "completed"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isGamedayModeEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { eventId } = await params;

  let status: string;
  try {
    const body = await req.json();
    status = String(body.status ?? "");
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getAdminDb();
  const eventRef = db.collection("speakingEvents").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists || eventSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await eventRef.update({ status });

  return NextResponse.json({ eventId, status });
}
