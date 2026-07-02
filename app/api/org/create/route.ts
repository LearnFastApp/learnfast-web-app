import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { requireEnterprise } from "@/lib/feature-flags";
import type { OrgSettings } from "@/types/enterprise";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

async function uniqueSlug(db: ReturnType<typeof getAdminDb>, base: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`;
    const snap = await db.collection("organizations").where("slug", "==", candidate).limit(1).get();
    if (snap.empty) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    requireEnterprise();
  } catch {
    return NextResponse.json({ error: "enterprise_not_enabled" }, { status: 403 });
  }

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, seats } = body as { name?: string; seats?: number };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (typeof seats !== "number" || seats < 5 || seats > 50) {
    return NextResponse.json({ error: "invalid_seats", min: 5, max: 50 }, { status: 400 });
  }

  const db = getAdminDb();

  // Block if user is already in an org
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  if (presenterSnap.data()?.orgId) {
    return NextResponse.json({ error: "already_in_org" }, { status: 409 });
  }

  const presenterEmail = presenterSnap.data()?.email as string ?? "";
  const presenterName = presenterSnap.data()?.displayName as string ?? presenterEmail.split("@")[0];

  const slug = await uniqueSlug(db, slugify(name.trim()));
  const now = Timestamp.now();
  const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  const defaultSettings: OrgSettings = {
    managerCanViewIndividualSessions: false,
    defaultSessionVisibility: "private",
    allowedEmailDomains: [],
    feedbackAnonymousDefault: true,
    leaderboardEnabled: false,
    defaultFeedScope: "org",
  };

  const orgRef = db.collection("organizations").doc();
  const orgId = orgRef.id;

  const orgData = {
    name: name.trim(),
    slug,
    logoUrl: null,
    createdAt: now,
    createdBy: uid,
    plan: "enterprise",
    subscriptionStatus: "trialing",
    trialEndsAt,
    seats: { purchased: seats, used: 1 },
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    settings: defaultSettings,
  };

  const memberData = {
    role: "owner",
    email: presenterEmail,
    displayName: presenterName,
    joinedAt: now,
    invitedBy: null,
    status: "active",
  };

  // Atomic: create org + member doc + update presenter
  const batch = db.batch();
  batch.set(orgRef, orgData);
  batch.set(db.doc(`organizations/${orgId}/members/${uid}`), memberData);
  batch.update(db.doc(`presenters/${uid}`), {
    orgId,
    orgRole: "owner",
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return NextResponse.json({ orgId, slug }, { status: 201 });
}
