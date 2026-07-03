import { getAdminDb } from "@/lib/firebase-admin";

// Unambiguous chars — no 0/O, 1/I/L confusion
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join("");
}

export async function generateUniqueFeedbackCode(): Promise<string> {
  const db = getAdminDb();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await db.collection("session_feedback_codes").doc(code).get();
    if (!existing.exists) return code;
  }
  throw new Error("Failed to generate unique feedback code after 10 attempts");
}
