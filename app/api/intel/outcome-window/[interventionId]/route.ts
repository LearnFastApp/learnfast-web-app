import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { getInterventionOutcomeWindow } from "@/lib/intervention-outcome";

export const dynamic = "force-dynamic";

/**
 * GET /api/intel/outcome-window/{interventionId}?n=3
 *
 * Returns the outcome window for an intervention — the n measurements that
 * followed it for the same user_key, with delta scores against the baseline.
 *
 * Admin-only endpoint. Used to verify the schema join works and to power
 * future recommendation engine tooling.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ interventionId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Platform admin only
  const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "physicalperformance@icloud.com";
  const { getAdminAuth } = await import("@/lib/firebase-admin");
  const userRecord = await getAdminAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { interventionId } = await params;
  const n = Math.min(parseInt(req.nextUrl.searchParams.get("n") ?? "3", 10), 10);

  const window = await getInterventionOutcomeWindow(interventionId, n);
  if (!window) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(window);
}
