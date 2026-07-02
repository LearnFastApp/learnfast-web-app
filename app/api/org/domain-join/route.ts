import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Called from auth/callback after sign-in to auto-join orgs that allow the user's email domain.
// No-ops silently if user already has an org or no matching domain org exists.
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  const presenterData = presenterSnap.data();

  // Already in an org — nothing to do
  if (presenterData?.orgId) {
    return NextResponse.json({ joined: false, reason: "already_in_org" });
  }

  const email = presenterData?.email as string | undefined;
  if (!email) return NextResponse.json({ joined: false, reason: "no_email" });

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return NextResponse.json({ joined: false, reason: "no_domain" });

  // Find an org with this domain in allowedEmailDomains with available seats
  const orgSnap = await db
    .collection("organizations")
    .where("settings.allowedEmailDomains", "array-contains", domain)
    .where("subscriptionStatus", "in", ["trialing", "active"])
    .limit(1)
    .get();

  if (orgSnap.empty) return NextResponse.json({ joined: false, reason: "no_matching_org" });

  const orgDoc = orgSnap.docs[0];
  const org = orgDoc.data();
  const orgId = orgDoc.id;

  if (org.seats.used >= org.seats.purchased) {
    return NextResponse.json({ joined: false, reason: "no_seats" });
  }

  const displayName = presenterData?.displayName as string ?? email.split("@")[0];

  await db.runTransaction(async (tx) => {
    const orgRef = db.doc(`organizations/${orgId}`);
    const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists) return; // race: already joined

    tx.set(memberRef, {
      role: "member",
      email,
      displayName,
      joinedAt: Timestamp.now(),
      invitedBy: null,
      status: "active",
    });
    tx.update(orgRef, { "seats.used": FieldValue.increment(1) });
    tx.update(db.doc(`presenters/${uid}`), {
      orgId,
      orgRole: "member",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({ joined: true, orgId });
}
