import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { OrgContext, OrgMember, OrgRole, Organization } from "@/types/enterprise";

const ROLE_HIERARCHY: OrgRole[] = ["member", "coach", "admin", "owner"];

/**
 * Resolves the full org context for a given user UID.
 * Performs three Firestore reads: presenter doc → member doc → org doc.
 * Returns null if the user has no active org membership.
 * Automatically transitions expired trials to "expired" status.
 */
export async function getOrgContext(uid: string): Promise<OrgContext | null> {
  const db = getAdminDb();

  // 1. Resolve orgId from the presenter doc (denormalized for speed)
  const presenterSnap = await db.doc(`presenters/${uid}`).get();
  const orgId = presenterSnap.data()?.orgId as string | undefined;
  if (!orgId) return null;

  // 2. Verify active membership in the org's member subcollection
  const memberSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!memberSnap.exists) return null;
  const memberData = memberSnap.data();
  if (memberData?.status !== "active") return null;

  // 3. Load the org doc
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) return null;

  const orgData = { ...orgSnap.data()! };

  // 4. Auto-expire trial if trialEndsAt has passed
  if (orgData.subscriptionStatus === "trialing") {
    const trialEndsAt = orgData.trialEndsAt?.toDate?.() as Date | undefined;
    if (trialEndsAt && trialEndsAt < new Date()) {
      orgData.subscriptionStatus = "expired";
      orgSnap.ref.update({ subscriptionStatus: "expired" }).catch(() => {});
    }
  }

  return {
    orgId,
    role: memberData.role as OrgRole,
    org: { id: orgId, ...orgData } as Organization,
    member: { id: uid, ...memberData } as OrgMember,
  };
}

/**
 * Returns a 402 NextResponse if the org's subscription is not active.
 * Pass `allowExpired: true` for billing-related routes that must stay
 * accessible so expired orgs can resubscribe.
 * Returns null when access should be allowed.
 */
export function requireActiveSubscription(
  ctx: OrgContext,
  opts?: { allowExpired?: boolean },
): NextResponse | null {
  const status = ctx.org.subscriptionStatus as string;
  if (!opts?.allowExpired && (status === "expired" || status === "cancelled")) {
    return NextResponse.json(
      { error: "subscription_inactive", status, billingPath: `/${ctx.orgId}/billing` },
      { status: 402 },
    );
  }
  return null;
}

/**
 * Returns true if `role` is at least as privileged as `minRole`.
 * Hierarchy (ascending): member < coach < admin < owner
 */
export function hasOrgPermission(role: OrgRole, minRole: OrgRole): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole);
}

/**
 * Validates a caller's OrgContext against a minimum required role,
 * throwing a typed error on failure. Use in API handlers after getOrgContext.
 */
export function assertOrgPermission(
  ctx: OrgContext,
  minRole: OrgRole,
): void {
  if (!hasOrgPermission(ctx.role, minRole)) {
    throw Object.assign(new Error("Insufficient org permissions"), {
      code: "org_permission_denied",
      status: 403,
    });
  }
}
