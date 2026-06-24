import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const FREE_SESSION_LIMIT = 2;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (const byte of array) code += chars[byte % chars.length];
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const verifiedUid = await verifyAuthToken(req);
    if (!verifiedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, tags } = (await req.json()) as {
      title?: string;
      tags?: string[];
    };

    const db = getAdminDb();

    // Check subscription status and enforce free tier limit
    const presenterDoc = await db.collection("presenters").doc(verifiedUid).get();
    const presenter = presenterDoc.data();
    const subscriptionStatus = presenter?.subscriptionStatus ?? "free";

    if (subscriptionStatus !== "active") {
      const sessionSnap = await db
        .collection("sessions")
        .where("presenterId", "==", verifiedUid)
        .count()
        .get();
      if (sessionSnap.data().count >= FREE_SESSION_LIMIT) {
        return NextResponse.json({ error: "free_tier_limit" }, { status: 403 });
      }
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db
        .collection("sessions")
        .where("code", "==", code)
        .limit(1)
        .get();
      if (existing.empty) break;
      code = generateCode();
      attempts++;
    }

    const ref = await db.collection("sessions").add({
      presenterId: verifiedUid,
      title: title?.trim() || "Untitled session",
      code,
      tags: tags ?? [],
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null,
      summarySent: false,
    });

    return NextResponse.json({ sessionId: ref.id, code });
  } catch (err) {
    console.error("[sessions/create]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
