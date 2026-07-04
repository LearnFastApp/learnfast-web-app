import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

// GET /api/coaches/[slug] — public coach profile; increments profileViews fire-and-forget
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const db = getAdminDb();

  const snap = await db
    .collection("coachesPublic")
    .where("slug", "==", slug)
    .where("status", "==", "live")
    .limit(1)
    .get();

  if (snap.empty) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const doc = snap.docs[0];
  const data = doc.data();

  // Fire-and-forget view counter on the private coaches collection
  db.collection("coaches")
    .where("slug", "==", slug)
    .limit(1)
    .get()
    .then((s) => {
      if (!s.empty) {
        s.docs[0].ref.update({ "metrics.profileViews": FieldValue.increment(1) }).catch(() => {});
      }
    })
    .catch(() => {});

  return NextResponse.json({ coach: { id: doc.id, ...data } });
}
