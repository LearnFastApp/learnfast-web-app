import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);

  // Granular 403 to help diagnose membership issues
  if (!ctx) {
    const db = getAdminDb();
    const presSnap = await db.doc(`presenters/${uid}`).get();
    const storedOrgId = presSnap.data()?.orgId;
    if (!storedOrgId) {
      return NextResponse.json({ error: "no_org_on_account" }, { status: 403 });
    }
    const memberSnap = await db.doc(`organizations/${storedOrgId}/members/${uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "not_a_member", storedOrgId }, { status: 403 });
    }
    if (memberSnap.data()?.status !== "active") {
      return NextResponse.json({ error: "member_not_active", status: memberSnap.data()?.status, storedOrgId }, { status: 403 });
    }
    return NextResponse.json({ error: "org_not_found", storedOrgId }, { status: 403 });
  }
  if (ctx.orgId !== orgId) {
    return NextResponse.json({ error: "wrong_org", yourOrgId: ctx.orgId, requestedOrgId: orgId }, { status: 403 });
  }

  const db = getAdminDb();

  // Ensure org members always have at least "lite" — catches accounts that
  // joined before the join route started setting subscriptionStatus on accept.
  const presSnap = await db.doc(`presenters/${uid}`).get();
  if (presSnap.exists && presSnap.data()?.subscriptionStatus === "free") {
    await db.doc(`presenters/${uid}`).update({ subscriptionStatus: "lite" });
  }

  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  const org = orgSnap.data()!;

  return NextResponse.json({
    name: org.name,
    slug: org.slug,
    seats: org.seats,
    subscriptionStatus: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt instanceof Timestamp
      ? org.trialEndsAt.toDate().toISOString()
      : null,
    plan: org.plan,
    settings: org.settings,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    myRole: ctx.role,
    logoUrl: org.logoUrl ?? null,
    brandColor: (org.brandColor as string | undefined) ?? null,
    defaultLocale: (org.defaultLocale as string | undefined) ?? "en",
    coachRoster: org.coachRoster ?? { enabled: true, mode: "all", approvedCoachIds: [] },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "not_in_org" }, { status: 403 });
  }
  if (!hasOrgPermission(ctx.role, "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
    updates.name = name;
  }

  if ("logoUrl" in body) {
    const url = typeof body.logoUrl === "string" ? body.logoUrl.trim() : null;
    if (url && !/^https?:\/\/.+/.test(url)) {
      return NextResponse.json({ error: "invalid_logo_url" }, { status: 400 });
    }
    updates.logoUrl = url || null;
  }

  if ("brandColor" in body) {
    const color = typeof body.brandColor === "string" ? body.brandColor.trim() : null;
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ error: "invalid_brand_color" }, { status: 400 });
    }
    updates.brandColor = color || null;
  }

  if (typeof body.defaultLocale === "string") {
    const dl = body.defaultLocale;
    if (dl !== "en" && dl !== "fr") {
      return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
    }
    updates.defaultLocale = dl;
  }

  if (body.coachRoster !== undefined) {
    const cr = body.coachRoster as { enabled?: boolean; mode?: string; approvedCoachIds?: string[] };
    updates.coachRoster = {
      enabled: typeof cr.enabled === "boolean" ? cr.enabled : true,
      mode: cr.mode === "approved_only" ? "approved_only" : "all",
      approvedCoachIds: Array.isArray(cr.approvedCoachIds) ? cr.approvedCoachIds : [],
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.doc(`organizations/${orgId}`).update(updates);

  return NextResponse.json({ ok: true });
}
