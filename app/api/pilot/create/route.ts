import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "physicalperformance@icloud.com";

export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify caller is admin
  const userRecord = await getAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgName, code, maxUses, durationDays } = (await req.json()) as {
    orgName?: string;
    code?: string;
    maxUses?: number;
    durationDays?: number;
  };

  if (!orgName?.trim()) {
    return NextResponse.json({ error: "Organisation name is required" }, { status: 400 });
  }

  const db = getAdminDb();

  // Generate code from org name if not provided
  const finalCode = code?.trim().toUpperCase() ||
    orgName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const codeRef = db.collection("pilot_codes").doc(finalCode);
  const existing = await codeRef.get();
  if (existing.exists) {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }

  await codeRef.set({
    orgName: orgName.trim(),
    code: finalCode,
    maxUses: maxUses ?? 100,
    durationDays: typeof durationDays === "number" && durationDays > 0 ? durationDays : 30,
    usedBy: [],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
  });

  return NextResponse.json({ success: true, code: finalCode, orgName: orgName.trim() });
}

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRecord = await getAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminDb();
  const snap = await db.collection("pilot_codes").orderBy("createdAt", "desc").get();

  const codes = snap.docs.map((d) => {
    const data = d.data();
    return {
      code: d.id,
      orgName: data.orgName,
      maxUses: data.maxUses,
      durationDays: data.durationDays ?? 30,
      usedCount: (data.usedBy ?? []).length,
      active: data.active,
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
    };
  });

  return NextResponse.json({ codes });
}

export async function PATCH(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRecord = await getAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code, active } = (await req.json()) as { code: string; active: boolean };
  const db = getAdminDb();
  await db.collection("pilot_codes").doc(code).update({ active });

  return NextResponse.json({ success: true });
}
