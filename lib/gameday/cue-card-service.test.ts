import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCueCard, CueCardExtractionError } from "./cue-card-service.ts";

function mockClient(responseText: string) {
  return {
    messages: {
      create: async () => ({ content: [{ type: "text", text: responseText }] }),
    },
  } as never;
}

function throwingClient(error: unknown) {
  return {
    messages: {
      create: async () => {
        throw error;
      },
    },
  } as never;
}

const VALID_RESPONSE = JSON.stringify({
  openingLine: "Three years ago, I almost quit.",
  anchors: ["The turning point", "What changed", "The proof"],
  closingLine: "That's why we're here today.",
});

test("extractCueCard: success path parses a valid model response", async () => {
  const card = await extractCueCard({ transcript: "some transcript text" }, mockClient(VALID_RESPONSE));
  assert.equal(card.openingLine, "Three years ago, I almost quit.");
  assert.equal(card.anchors.length, 3);
  assert.equal(card.closingLine, "That's why we're here today.");
});

test("extractCueCard: strips markdown code fences before parsing", async () => {
  const fenced = "```json\n" + VALID_RESPONSE + "\n```";
  const card = await extractCueCard({ transcript: "x" }, mockClient(fenced));
  assert.equal(card.anchors.length, 3);
});

test("extractCueCard: network/API failure surfaces as CueCardExtractionError, never throws raw", async () => {
  await assert.rejects(
    () => extractCueCard({ transcript: "x" }, throwingClient(new Error("connection reset"))),
    CueCardExtractionError
  );
});

test("extractCueCard: malformed (non-JSON) response surfaces as CueCardExtractionError", async () => {
  await assert.rejects(
    () => extractCueCard({ transcript: "x" }, mockClient("Sorry, I can't do that.")),
    CueCardExtractionError
  );
});

test("extractCueCard: wrong shape (missing anchor) surfaces as CueCardExtractionError", async () => {
  const badShape = JSON.stringify({ openingLine: "Hi", anchors: ["only one"], closingLine: "Bye" });
  await assert.rejects(() => extractCueCard({ transcript: "x" }, mockClient(badShape)), CueCardExtractionError);
});

test("extractCueCard: empty string fields are rejected as invalid shape", async () => {
  const emptyField = JSON.stringify({ openingLine: "", anchors: ["a", "b", "c"], closingLine: "Bye" });
  await assert.rejects(() => extractCueCard({ transcript: "x" }, mockClient(emptyField)), CueCardExtractionError);
});

test("extractCueCard: non-text content block surfaces as CueCardExtractionError", async () => {
  const client = {
    messages: { create: async () => ({ content: [{ type: "tool_use" }] }) },
  } as never;
  await assert.rejects(() => extractCueCard({ transcript: "x" }, client), CueCardExtractionError);
});
