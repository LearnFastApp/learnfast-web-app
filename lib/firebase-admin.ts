import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextRequest } from "next/server";

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp();
  }
}

export function getAdminDb() {
  ensureAdminApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

export async function verifyAuthToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error("[verifyAuthToken] token verification failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
