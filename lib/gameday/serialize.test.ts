import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeTimestamps } from "./serialize.ts";

function fakeTimestamp(iso: string) {
  return { toDate: () => new Date(iso) };
}

test("serializeTimestamps: converts Timestamp-like fields to ISO strings", () => {
  const doc = {
    sessionType: "fullrun",
    targetDate: fakeTimestamp("2026-08-15T00:00:00.000Z"),
    completedAt: fakeTimestamp("2026-08-16T09:30:00.000Z"),
  };
  const result = serializeTimestamps(doc);
  assert.equal(result.targetDate, "2026-08-15T00:00:00.000Z");
  assert.equal(result.completedAt, "2026-08-16T09:30:00.000Z");
  assert.equal(typeof result.targetDate, "string");
});

test("serializeTimestamps: leaves null, strings, numbers, and booleans untouched", () => {
  const doc = { targetDate: null, ordinal: 3, sessionType: "polish", isCurrent: true };
  const result = serializeTimestamps(doc);
  assert.deepEqual(result, doc);
});

test("serializeTimestamps: regression — a Timestamp-like field must never survive as an object with no .localeCompare (the exact crash this fixes)", () => {
  const doc = { targetDate: fakeTimestamp("2026-08-15T00:00:00.000Z") };
  const result = serializeTimestamps(doc);
  assert.equal(typeof (result.targetDate as unknown as string).localeCompare, "function");
});
