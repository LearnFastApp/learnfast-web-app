import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ items: [] });

  const dimension = req.nextUrl.searchParams.get("dimension");
  const db = getAdminDb();

  // Look up presenter to find orgId and subscriptionStatus
  const presSnap = await db.doc(`presenters/${uid}`).get();
  const presData = presSnap.data() ?? {};
  const orgId: string | null = presData.orgId ?? null;
  const subStatus: string = presData.subscriptionStatus ?? "free";
  const isPaid = subStatus === "active" || subStatus === "pilot";

  const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = [];

  // Org content
  if (orgId) {
    let q = db.collection("library_content")
      .where("orgId", "==", orgId)
      .where("isVisible", "==", true);
    if (dimension) q = q.where("dimension", "in", [dimension, "general"]) as typeof q;
    queries.push(q.orderBy("createdAt", "desc").get());
  }

  // Premium content — visible to paid/enterprise users
  if (isPaid || orgId) {
    let q = db.collection("library_content")
      .where("isPremium", "==", true)
      .where("isVisible", "==", true);
    if (dimension) q = q.where("dimension", "in", [dimension, "general"]) as typeof q;
    queries.push(q.orderBy("createdAt", "desc").get());
  }

  const results = await Promise.all(queries);
  const seen = new Set<string>();
  const items: Record<string, unknown>[] = [];

  for (const snap of results) {
    for (const doc of snap.docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      items.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      });
    }
  }

  return NextResponse.json({ items });
}
