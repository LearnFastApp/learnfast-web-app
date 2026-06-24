import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import { verifyAuthToken, getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const verifiedUid = await verifyAuthToken(req);
    if (!verifiedUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = (await req.json()) as { customerId: string };
    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }

    // Verify the customerId actually belongs to the authenticated user
    const db = getAdminDb();
    const presenterDoc = await db.collection("presenters").doc(verifiedUid).get();
    if (presenterDoc.data()?.stripeCustomerId !== customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
