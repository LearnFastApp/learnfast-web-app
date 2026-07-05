import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth, verifyAuthToken } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const PLATFORM_ADMIN_EMAIL = "physicalperformance@icloud.com";

// One-time endpoint: stamps isPlatformAdmin:true on the calling user's presenter
// document. Checks email against Firebase Admin Auth (ground truth).
// Returns debug info so you can see exactly what email Firebase has on file.
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [authUser, db] = await Promise.all([
    getAdminAuth().getUser(uid),
    Promise.resolve(getAdminDb()),
  ]);

  const firebaseEmail = authUser.email ?? null;
  const providerEmails = authUser.providerData.map((p) => ({
    provider: p.providerId,
    email: p.email,
  }));

  const isAdmin = firebaseEmail === PLATFORM_ADMIN_EMAIL ||
    authUser.providerData.some((p) => p.email === PLATFORM_ADMIN_EMAIL);

  if (!isAdmin) {
    return NextResponse.json(
      { error: "forbidden", uid, firebaseEmail, providerEmails },
      { status: 403 }
    );
  }

  await db.doc(`presenters/${uid}`).set({ isPlatformAdmin: true }, { merge: true });
  return NextResponse.json({ ok: true, uid, firebaseEmail, providerEmails });
}
