/**
 * Register (or update) a scoring version in Firestore.
 *
 * Run BEFORE deploying any change to the scoring prompt, model, or rubric:
 *   node scripts/seed-scoring-version.mjs
 *
 * v2 (2026-07-10, backdated registration for commit 2d4a558 on 2026-07-05):
 * bumped because that commit changed live scoring behavior — injecting a
 * "previous tips" block into the prompt to reduce repetition across a
 * presenter's sessions, and setting temperature: 0.8 for more varied
 * phrasing — without registering a new version at the time. Scores from
 * 2026-07-05 onward are sv_2026_07_v2 in substance even though the doc is
 * only being created now; this seed is the first opportunity to close
 * that gap going forward.
 *
 * For future version bumps, update VERSION_ID and NOTES below and run again.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL("../.firebaserc", import.meta.url), "utf8")).projects.default;

if (!getApps().length) initializeApp({ projectId });
const db = getFirestore();

// ── Current scoring version config ───────────────────────────────────────────
const VERSION_ID = "sv_2026_07_v2";

const MODEL = process.env.AI_MODEL ?? "claude-sonnet-4-6";
const TRANSCRIPTION_PROVIDER = "assemblyai — sentiment_analysis, auto_chapters disabled; filler_words enabled; language_detection enabled";
const RUBRIC_VERSION = "five-dimension-v1";
const NOTES = "Same five-dimension rubric as sv_2026_07_v1 (Clarity/Energy/Engagement/Understanding/Connection, calibration 0-100, anchors at 40/55/70/85). Changed from v1 (commit 2d4a558, 2026-07-05): assessment prompt now injects a PREVIOUS TIPS block (presenter's prior tips passed in, explicitly instructed not to repeat them) to reduce repetitive coaching across sessions; API call now sets temperature: 0.8 (was unset/deterministic) for more varied phrasing. Rehearsal prompt unchanged.";

// Hash of the scoring prompt template — regenerate if prompt changes by running:
// node -e "const {createHash}=require('crypto');const fs=require('fs');const p=fs.readFileSync('lib/ai-assessment-analysis.ts','utf8');console.log(createHash('sha256').update(p).digest('hex'))"
const PROMPT_HASH = createHash("sha256")
  .update(`five-dimension-assessment-prompt:${MODEL}:${RUBRIC_VERSION}:2026-07-v2-previous-tips-temp0.8`)
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
