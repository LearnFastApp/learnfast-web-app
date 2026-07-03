import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();

  const [membersSnap, orgSnap, sessionsSnap, completedSnap] = await Promise.all([
    // Step 1: team invited = org has ≥2 active members
    db.collection(`organizations/${orgId}/members`).where("status", "==", "active").limit(3).get(),
    // Step 2: branding set = org doc has logoUrl
    db.doc(`organizations/${orgId}`).get(),
    // Step 3: session scheduled = ≥1 session exists
    db.collection(`organizations/${orgId}/sessions`).limit(1).get(),
    // Step 4: feedback collected = ≥1 completed session
    db.collection(`organizations/${orgId}/sessions`).where("status", "==", "completed").limit(1).get(),
  ]);

  return NextResponse.json({
    teamInvited: membersSnap.size >= 2,
    brandingSet: !!(orgSnap.data()?.logoUrl),
    sessionScheduled: !sessionsSnap.empty,
    feedbackCollected: !completedSnap.empty,
  });
}
