import { getAdminDb } from "@/lib/firebase-admin";
import type { OrgContext, OrgMember, OrgRole, Organization } from "@/types/enterprise";

const ROLE_HIERARCHY: OrgRole[] = ["member", "coach", "admin", "owner"];

/**
 * Resolves the full org context for a given user UID.
 * Performs three Firestore reads: presenter doc → member doc → org doc.
 * Returns null if the user has no active org membership.
 *
 * Use in API route handlers to gate enterprise features:
 *
 *   const ctx = await getOrgContext(uid);
 *   if (!ctx) return NextResponse.json({ error: 'not_in_org' }, { status: 403 });
 *   if (!hasOrgPermission(ctx.role, 'admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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

  return {
    orgId,
    role: memberData.role as OrgRole,
    org: { id: orgId, ...orgSnap.data() } as Organization,
    member: { id: uid, ...memberData } as OrgMember,
  };
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
