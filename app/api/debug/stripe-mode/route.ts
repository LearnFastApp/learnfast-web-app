import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return NextResponse.json({
    prefix: key.slice(0, 12),
    mode: key.startsWith("sk_live") ? "LIVE" : key.startsWith("sk_test") ? "TEST" : "UNKNOWN",
    keySet: key.length > 0,
  });
}
