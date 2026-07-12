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
 * v3 (2026-07-11): lib/rehearsal-coaching.ts now branches its prompt on
 * `sessionType`. The standard delivery-focused prompt (buildFullRunPrompt) is
 * byte-for-byte unchanged from v2 and still applies to every rehearsal take
 * except one new case: "triage-lite" (Gameday's 2-minute unscripted outline)
 * now uses a separate planning-focused prompt (buildTriageLiteOutlinePrompt)
 * that does not score or coach delivery at all — it reinterprets the same
 * five dimensions around the strength of the underlying ideas, and reframes
 * strength/coaching/nextFocus/encouragement as planning guidance for the next
 * rehearsal rather than a delivery critique. Rubric dimensions and JSON output
 * shape are unchanged; only triage-lite's prompt content and interpretation
 * differ.
 *
 * v4 (2026-07-11): refined the triage-lite prompt further — explicit
 * instruction to speak in a direct, second-person "coach in the room" voice
 * grounded in specifics from the actual transcript (never a templated/generic
 * response), plus a new `readyForScript` boolean field: the coach now
 * explicitly decides whether the outline has enough content to move to
 * script-building, and either points the presenter at "Suggest script
 * improvements" or asks for a focused follow-up pass naming the specific gap.
 * `readyForScript` is optional/undefined for every non-triage-lite response.
 * Rubric dimensions and every other session type's prompt are unchanged.
 *
 * v5 (2026-07-11): triage-lite now produces an actual structural outline when
 * readyForScript is true, instead of just pointing at the (separate,
 * post-fullrun) script-improvement feature — grounded in two established
 * presentation-coaching frameworks: Chris Anderson's "throughline" (TED Talks:
 * The Official TED Guide to Public Speaking) and Nancy Duarte's "Sparkline"
 * (Resonate) oscillating between "what is" and "what could be". New optional
 * `suggestedOutline` field ({throughline, sections: [{type, label, content}]}),
 * built only from the presenter's own stated ideas — never invented content.
 * Null when readyForScript is false or absent for every non-triage-lite
 * response. The "Suggest script improvements" trigger is now hidden entirely
 * for triage-lite in the UI (the outline replaces it at this stage). All
 * other session types' prompts unchanged from v4.
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
const VERSION_ID = "sv_2026_07_v5";

const MODEL = process.env.AI_MODEL ?? "claude-sonnet-4-6";
const TRANSCRIPTION_PROVIDER = "assemblyai — sentiment_analysis, auto_chapters disabled; filler_words enabled; language_detection enabled";
const RUBRIC_VERSION = "five-dimension-v1";
const NOTES = "Same five-dimension rubric as sv_2026_07_v4 for every rehearsal take except 'triage-lite' (Gameday's 2-minute unscripted outline). v5 adds a structural-outline capability to triage-lite: when readyForScript is true, the response now includes suggestedOutline ({throughline, sections}) built from Chris Anderson's throughline concept + Nancy Duarte's Sparkline framework, organizing (never inventing) the presenter's own ideas into Opening -> Insight/Reflection pairs -> Closing. All other session types unchanged from v4.";

// Hash of the scoring prompt template — regenerate if prompt changes by running:
// node -e "const {createHash}=require('crypto');const fs=require('fs');const p=fs.readFileSync('lib/ai-assessment-analysis.ts','utf8');console.log(createHash('sha256').update(p).digest('hex'))"
const PROMPT_HASH = createHash("sha256")
  .update(`five-dimension-assessment-prompt:${MODEL}:${RUBRIC_VERSION}:2026-07-v5-triage-lite-structured-outline`)
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
