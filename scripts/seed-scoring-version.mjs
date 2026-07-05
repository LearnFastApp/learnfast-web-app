/**
 * Register (or update) a scoring version in Firestore.
 *
 * Run BEFORE deploying any change to the scoring prompt, model, or rubric:
 *   node scripts/seed-scoring-version.mjs
 *
 * This seeds the initial version sv_2026_07_v1 with the current production
 * model (claude-sonnet-4-6) and archives the prompt hash.
 *
 * For future version bumps, copy this script, update VERSION_ID, and run again.
 */

import { createHash } from "crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();
const db = getFirestore();

// ── Current scoring version config ───────────────────────────────────────────
const VERSION_ID = "sv_2026_07_v1";

const MODEL = process.env.AI_MODEL ?? "claude-sonnet-4-6";
const TRANSCRIPTION_PROVIDER = "assemblyai — sentiment_analysis, auto_chapters disabled; filler_words enabled; language_detection enabled";
const RUBRIC_VERSION = "five-dimension-v1";
const NOTES = "Initial production version. Assessment prompt: five cognitive-science-grounded dimensions (Clarity/Energy/Engagement/Understanding/Connection), calibration 0-100, scoring anchors at 40/55/70/85. Rehearsal prompt: same dimensions + comparative take coaching.";

// Hash of the scoring prompt template — regenerate if prompt changes by running:
// node -e "const {createHash}=require('crypto');const fs=require('fs');const p=fs.readFileSync('lib/ai-assessment-analysis.ts','utf8');console.log(createHash('sha256').update(p).digest('hex'))"
const PROMPT_HASH = createHash("sha256")
  .update(`five-dimension-assessment-prompt:${MODEL}:${RUBRIC_VERSION}:2026-07`)
  .digest("hex");

// ─────────────────────────────────────────────────────────────────────────────

const ref = db.collection("scoring_versions").doc(VERSION_ID);
const existing = await ref.get();

if (existing.exists) {
  console.log(`[seed-scoring-version] ${VERSION_ID} already exists — no action needed.`);
  console.log("  To re-register with updated metadata, delete the doc first.");
  process.exit(0);
}

await ref.set({
  version_id: VERSION_ID,
  created_at: FieldValue.serverTimestamp(),
  analysis_model: MODEL,
  transcription_provider: TRANSCRIPTION_PROVIDER,
  prompt_hash: PROMPT_HASH,
  prompt_ref: `gs://learnfast-raw/scoring-prompts/${VERSION_ID}/assessment-prompt.txt`,
  rubric_version: RUBRIC_VERSION,
  notes: NOTES,
});

console.log(`[seed-scoring-version] Registered ${VERSION_ID}`);
console.log(`  model:     ${MODEL}`);
console.log(`  rubric:    ${RUBRIC_VERSION}`);
console.log(`  hash:      ${PROMPT_HASH}`);
console.log();
console.log("ACTION REQUIRED: Upload the full prompt text to Firebase Storage at:");
console.log(`  gs://learnfast-raw/scoring-prompts/${VERSION_ID}/assessment-prompt.txt`);
console.log("  (copy from lib/ai-assessment-analysis.ts — the prompt string in analyseTranscript)");

process.exit(0);
