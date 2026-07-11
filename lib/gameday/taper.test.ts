import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSessionTypeTaperLegal,
  describeTaperConstraint,
  TAPER_ALLOWED_SESSION_TYPES,
  TAPER_FINAL_DAY_MAX_SECONDS,
  MAX_SESSIONS_PER_DAY,
} from "./taper.ts";
import type { SessionType } from "./types.ts";

test("isSessionTypeTaperLegal: only polish and confidence are taper-legal", () => {
  const ALL: SessionType[] = [
    "triage", "triage-lite", "repair", "fullrun", "pressure", "polish", "confidence", "warmup", "debrief",
  ];
  for (const type of ALL) {
    assert.equal(isSessionTypeTaperLegal(type), TAPER_ALLOWED_SESSION_TYPES.includes(type), type);
  }
  assert.equal(isSessionTypeTaperLegal("triage"), false);
  assert.equal(isSessionTypeTaperLegal("pressure"), false);
  assert.equal(isSessionTypeTaperLegal("polish"), true);
  assert.equal(isSessionTypeTaperLegal("confidence"), true);
});

test("describeTaperConstraint: final 24h caps at 2 minutes", () => {
  assert.deepEqual(describeTaperConstraint(1), { maxRecordSeconds: TAPER_FINAL_DAY_MAX_SECONDS });
  assert.deepEqual(describeTaperConstraint(0), { maxRecordSeconds: TAPER_FINAL_DAY_MAX_SECONDS });
});

test("describeTaperConstraint: earlier taper days carry no extra constraint", () => {
  assert.equal(describeTaperConstraint(2), null);
  assert.equal(describeTaperConstraint(5), null);
});

test("MAX_SESSIONS_PER_DAY: taper is stricter than the rest of the plan", () => {
  assert.equal(MAX_SESSIONS_PER_DAY.taper, 1);
  assert.equal(MAX_SESSIONS_PER_DAY.other, 2);
  assert.ok(MAX_SESSIONS_PER_DAY.taper < MAX_SESSIONS_PER_DAY.other);
});
