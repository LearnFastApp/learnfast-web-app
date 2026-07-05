import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrCreateUserKey } from "@/lib/user-key";
import { logEvent } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

/**
 * Called client-side immediately after createUserWithEmailAndPassword,
 * before signOut (email verification flow). Creates the user_key and
 * fires the funnel.signup event.
 *
 * Fire-and-forget from the client — 200 or failure both acceptable.
 */
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let locale = "en";
  let industry: string | null = null;
  try {
    const body = await req.json();
    locale = (body.locale as string) || "en";
    industry = (body.industry as string) || null;
  } catch {
    // optional body — proceed with defaults
  }

  const db = getAdminDb();
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const email = presenterSnap.data()?.email as string | undefined;

  const user_key = await getOrCreateUserKey(uid);

  logEvent("funnel.signup", {
    user_key,
    context: { surface: "web", locale },
    payload: { industry, has_email: !!email },
  });

  return NextResponse.json({ ok: true });
}
