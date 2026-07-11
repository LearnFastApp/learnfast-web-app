import { test } from "node:test";
import assert from "node:assert/strict";
import { SESSION_TYPE_LIBRARY, effectiveMaxRecordSeconds } from "./session-types.ts";

test("confidence and warmup are never scored; everything else is", () => {
  assert.equal(SESSION_TYPE_LIBRARY.confidence.scored, false);
  assert.equal(SESSION_TYPE_LIBRARY.warmup.scored, false);
  for (const type of ["triage", "triage-lite", "repair", "fullrun", "pressure", "polish", "debrief"] as const) {
    assert.equal(SESSION_TYPE_LIBRARY[type].scored, true, type);
  }
});

test("effectiveMaxRecordSeconds: session-type cap never exceeds the tier ceiling", () => {
  assert.equal(effectiveMaxRecordSeconds(1200, "triage-lite"), 120);
  assert.equal(effectiveMaxRecordSeconds(60, "triage-lite"), 60); // tier ceiling is stricter than the type cap
  assert.equal(effectiveMaxRecordSeconds(1200, "polish"), 120);
});

test("effectiveMaxRecordSeconds: session types with no cap just use the tier ceiling", () => {
  assert.equal(effectiveMaxRecordSeconds(1200, "fullrun"), 1200);
  assert.equal(effectiveMaxRecordSeconds(300, "triage"), 300);
  assert.equal(effectiveMaxRecordSeconds(300, "confidence"), 300);
});

test("fullrun is standing + no-notes, matching 'complete delivery under event conditions'", () => {
  assert.equal(SESSION_TYPE_LIBRARY.fullrun.constraint?.standing, true);
  assert.equal(SESSION_TYPE_LIBRARY.fullrun.constraint?.noNotes, true);
});

test("warmup is audio-optional and never scored (no camera, per spec)", () => {
  assert.equal(SESSION_TYPE_LIBRARY.warmup.scored, false);
  assert.equal(SESSION_TYPE_LIBRARY.warmup.constraint?.audioOptional, true);
});
