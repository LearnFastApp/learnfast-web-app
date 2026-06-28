import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guestUid = `guest-${crypto.randomUUID()}`;
  try {
    const customToken = await getAdminAuth().createCustomToken(guestUid, { role: "guest" });
    return NextResponse.json({ customToken, guestUid });
  } catch (err) {
    console.error("[guest-token] createCustomToken failed:", err);
    return NextResponse.json({ error: "token_error" }, { status: 500 });
  }
}
