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
    specialties?: string;
    pitch?: string;
    tryCompleted?: boolean;
  };

  const { name, email, linkedinUrl, specialties, pitch, tryCompleted } = body;

  if (!name || !email || !pitch) {
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
    specialties: specialties ?? "",
    pitch,
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
    pitch,
    tryCompleted: tryCompleted ?? false,
    adminUrl,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: ref.id });
}
