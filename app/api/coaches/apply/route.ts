import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendCoachApplicationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/coaches/apply — submit coach application
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name?: string;
    email?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    credentials?: string;
    timezone?: string;
    specialties?: string;
    quote?: string;
    bioShort?: string;
    bioLong?: string;
    tryCompleted?: boolean;
  };

  const { name, email, linkedinUrl, websiteUrl, credentials, timezone, specialties, quote, bioShort, bioLong, tryCompleted } = body;

  if (!name || !email || !bioShort || !bioLong) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const db = getAdminDb();

  // Prevent duplicate applications from same email
  const existing = await db
    .collection("coachApplications")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json({ error: "already_applied" }, { status: 409 });
  }

  const now = Timestamp.now();
  const ref = db.collection("coachApplications").doc();
  await ref.set({
    name,
    email,
    linkedinUrl: linkedinUrl ?? "",
    websiteUrl: websiteUrl ?? "",
    credentials: credentials ?? "",
    timezone: timezone ?? "Europe/London",
    specialties: specialties ?? "",
    quote: (quote ?? "").slice(0, 140),
    bioShort: (bioShort ?? "").slice(0, 280),
    bioLong: bioLong ?? "",
    tryCompleted: tryCompleted ?? false,
    status: "new",
    createdAt: now,
  });

  // Notify admin — fire-and-forget
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://learnfastapp.com"}/admin/coaches`;
  sendCoachApplicationEmail({
    applicantName: name,
    applicantEmail: email,
    linkedinUrl: linkedinUrl ?? "",
    specialties: specialties ?? "",
    pitch: bioLong ?? "",
    tryCompleted: tryCompleted ?? false,
    adminUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: ref.id });
}
