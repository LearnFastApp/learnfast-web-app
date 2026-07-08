import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrCreateUserKey } from "@/lib/user-key";
import { logEvent } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  const db = getAdminDb();
  const normalised = code.trim().toUpperCase();
  const codeRef = db.collection("pilot_codes").doc(normalised);
  const codeSnap = await codeRef.get();

  if (!codeSnap.exists) {
    return NextResponse.json({ error: "Invalid pilot code" }, { status: 404 });
  }

  const codeData = codeSnap.data()!;

  if (!codeData.active) {
    return NextResponse.json({ error: "This pilot code is no longer active" }, { status: 403 });
  }

  const usedBy: string[] = codeData.usedBy ?? [];
  if (usedBy.includes(uid)) {
    return NextResponse.json({ error: "You have already redeemed this code" }, { status: 409 });
  }

  if (usedBy.length >= (codeData.maxUses ?? 100)) {
    return NextResponse.json({ error: "This pilot code has reached its maximum uses" }, { status: 403 });
  }

  // Check presenter doesn't already have active paid or pilot subscription
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const presenter = presenterSnap.data();
  if (presenter?.subscriptionStatus === "active") {
    return NextResponse.json({ error: "You already have an active subscription" }, { status: 409 });
  }

  const durationDays =
    typeof codeData.durationDays === "number" && codeData.durationDays > 0
      ? codeData.durationDays
      : 30;
  const pilotExpiresAt = new Date();
  pilotExpiresAt.setDate(pilotExpiresAt.getDate() + durationDays);

  // Apply pilot to presenter
  await db.collection("presenters").doc(uid).update({
    subscriptionStatus: "pilot",
    pilotExpiresAt: Timestamp.fromDate(pilotExpiresAt),
    pilotCode: normalised,
    pilotOrgName: codeData.orgName,
  });

  // Record usage on the code
  await codeRef.update({
    usedBy: FieldValue.arrayUnion(uid),
  });

  const user_key = await getOrCreateUserKey(uid);
  logEvent("funnel.pilot_code_redeemed", {
    user_key,
    payload: {
      duration_days: durationDays,
      max_uses: codeData.maxUses ?? 100,
      used_count: usedBy.length + 1,
    },
  });

  return NextResponse.json({
    success: true,
    orgName: codeData.orgName,
    expiresAt: pilotExpiresAt.toISOString(),
  });
}
