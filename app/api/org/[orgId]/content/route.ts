import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";
import { hasOrgPermission } from "@/lib/org-context";
import type { LibraryDimension, LibraryContentType } from "@/types/enterprise";

export const dynamic = "force-dynamic";

const VALID_DIMENSIONS: LibraryDimension[] = [
  "clarity", "engagement", "energy", "understanding", "connection", "general",
];
const VALID_TYPES: LibraryContentType[] = ["video", "pdf", "link"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const snap = await db.collection("library_content")
    .where("orgId", "==", orgId)
    .orderBy("createdAt", "desc")
    .get();

  const items = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { title, description, type, url, storageRef, fileUrl, fileName, dimension } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  if (!VALID_DIMENSIONS.includes(dimension)) return NextResponse.json({ error: "invalid_dimension" }, { status: 400 });
  if ((type === "video" || type === "link") && !url?.trim()) {
    return NextResponse.json({ error: "url_required" }, { status: 400 });
  }
  if (type === "pdf" && !storageRef) {
    return NextResponse.json({ error: "storage_ref_required" }, { status: 400 });
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const db = getAdminDb();
  const ref = await db.collection("library_content").add({
    title: title.trim(),
    description: description?.trim() ?? "",
    type,
    url: url?.trim() ?? null,
    storageRef: storageRef ?? null,
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
    dimension,
    orgId,
    isPremium: false,
    isVisible: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
