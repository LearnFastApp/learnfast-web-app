/**
 * Phase 0 security rules tests.
 * Run via: npm run test:rules
 * (Requires Firebase emulators running — firebase.json configures Firestore on :8080)
 *
 * Coverage (Phase 0 acceptance criteria):
 *   ✓ Non-members cannot read org data
 *   ✓ Members cannot write org settings
 *   ✓ Unauth feedback create validates and rejects malformed payloads
 *
 * Additional coverage:
 *   ✓ Authenticated org members CAN read org data
 *   ✓ Admins CAN update org docs
 *   ✓ Members cannot read another org's data
 *   ✓ Members cannot update org doc (write settings)
 *   ✓ Valid enterprise feedback create succeeds (unauthenticated)
 *   ✓ Feedback rejects score out of range (> 10)
 *   ✓ Feedback rejects score out of range (< 1)
 *   ✓ Feedback rejects missing required fields
 *   ✓ Feedback rejects comment > 500 chars
 *   ✓ Feedback rejects missing nested scores map
 *   ✓ Members can read member sub-collection
 *   ✓ Members cannot write member sub-collection
 *   ✓ Non-members cannot read member sub-collection
 */

import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

const PROJECT_ID = "learnfast-app-cc98c";
const RULES = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

const ORG_ID = "test-org-alpha";
const OTHER_ORG_ID = "test-org-beta";
const MEMBER_UID = "uid-member-1";
const ADMIN_UID = "uid-admin-1";
const NON_MEMBER_UID = "uid-outsider-1";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: RULES,
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // Seed org docs and member docs (bypasses security rules)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, `organizations/${ORG_ID}`), {
      name: "Alpha Corp",
      slug: "alpha-corp",
      plan: "enterprise",
      subscriptionStatus: "trialing",
      createdBy: ADMIN_UID,
      seats: { purchased: 10, used: 2 },
      settings: {
        managerCanViewIndividualSessions: false,
        defaultSessionVisibility: "private",
        allowedEmailDomains: [],
        feedbackAnonymousDefault: true,
        leaderboardEnabled: false,
        defaultFeedScope: "org",
      },
    });

    await setDoc(doc(db, `organizations/${ORG_ID}/members/${MEMBER_UID}`), {
      role: "member",
      email: "member@example.com",
      displayName: "Test Member",
      status: "active",
    });

    await setDoc(doc(db, `organizations/${ORG_ID}/members/${ADMIN_UID}`), {
      role: "admin",
      email: "admin@example.com",
      displayName: "Test Admin",
      status: "active",
    });

    // Other org (no members from test users)
    await setDoc(doc(db, `organizations/${OTHER_ORG_ID}`), {
      name: "Beta Corp",
      slug: "beta-corp",
      plan: "enterprise",
      subscriptionStatus: "active",
      createdBy: "uid-beta-owner",
      seats: { purchased: 5, used: 1 },
      settings: {
        managerCanViewIndividualSessions: false,
        defaultSessionVisibility: "private",
        allowedEmailDomains: [],
        feedbackAnonymousDefault: true,
        leaderboardEnabled: false,
        defaultFeedScope: "org",
      },
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

// ── Org read access ───────────────────────────────────────────────────────────

describe("org read access", () => {
  it("unauthenticated user cannot read org doc", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `organizations/${ORG_ID}`)));
  });

  it("authenticated non-member cannot read org doc", async () => {
    const db = testEnv.authenticatedContext(NON_MEMBER_UID).firestore();
    await assertFails(getDoc(doc(db, `organizations/${ORG_ID}`)));
  });

  it("org member can read their own org doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${ORG_ID}`)));
  });

  it("org admin can read their own org doc", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${ORG_ID}`)));
  });

  it("member cannot read a different org's doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(getDoc(doc(db, `organizations/${OTHER_ORG_ID}`)));
  });
});

// ── Org write access ──────────────────────────────────────────────────────────

describe("org write access", () => {
  it("member cannot update org doc (change settings)", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(updateDoc(doc(db, `organizations/${ORG_ID}`), { name: "Hacked" }));
  });

  it("admin can update org doc", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, `organizations/${ORG_ID}`), { name: "Alpha Corp Updated" }));
  });

  it("non-member cannot update org doc", async () => {
    const db = testEnv.authenticatedContext(NON_MEMBER_UID).firestore();
    await assertFails(updateDoc(doc(db, `organizations/${ORG_ID}`), { name: "Hacked" }));
  });

  it("unauthenticated user cannot update org doc", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, `organizations/${ORG_ID}`), { name: "Hacked" }));
  });

  it("member cannot delete org", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(deleteDoc(doc(db, `organizations/${ORG_ID}`)));
  });
});

// ── Member sub-collection access ──────────────────────────────────────────────

describe("member sub-collection access", () => {
  it("org member can read member list", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `organizations/${ORG_ID}/members/${ADMIN_UID}`)));
  });

  it("non-member cannot read member list", async () => {
    const db = testEnv.authenticatedContext(NON_MEMBER_UID).firestore();
    await assertFails(getDoc(doc(db, `organizations/${ORG_ID}/members/${MEMBER_UID}`)));
  });

  it("member cannot write to member sub-collection", async () => {
    const db = testEnv.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(doc(db, `organizations/${ORG_ID}/members/uid-new`), {
        role: "member",
        email: "new@example.com",
        displayName: "New User",
        status: "active",
      })
    );
  });

  it("admin can write to member sub-collection", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, `organizations/${ORG_ID}/members/uid-new-by-admin`), {
        role: "member",
        email: "new2@example.com",
        displayName: "New By Admin",
        status: "active",
      })
    );
  });
});

// ── feedback_responses validation ─────────────────────────────────────────────

describe("feedback_responses validation (Phase 0 acceptance)", () => {
  const validScores = {
    clarity: 7,
    energy: 8,
    engagement: 6,
    understanding: 9,
    connection: 7,
  };

  it("valid enterprise feedback create succeeds (unauthenticated)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: validScores,
        submittedAt: new Date(),
      })
    );
  });

  it("rejects score above 10 (clarity: 11)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: { ...validScores, clarity: 11 },
        submittedAt: new Date(),
      })
    );
  });

  it("rejects score below 1 (energy: 0)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: { ...validScores, energy: 0 },
        submittedAt: new Date(),
      })
    );
  });

  it("rejects missing required field: sessionId", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        orgId: ORG_ID,
        scores: validScores,
        submittedAt: new Date(),
      })
    );
  });

  it("rejects missing required field: scores", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        submittedAt: new Date(),
      })
    );
  });

  it("rejects scores missing a dimension (no connection key)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const { connection, ...scoresWithoutConnection } = validScores;
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: scoresWithoutConnection,
        submittedAt: new Date(),
      })
    );
  });

  it("rejects comment longer than 500 characters", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: validScores,
        comment: "x".repeat(501),
        submittedAt: new Date(),
      })
    );
  });

  it("accepts comment exactly 500 characters", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: validScores,
        comment: "x".repeat(500),
        submittedAt: new Date(),
      })
    );
  });

  it("accepts response without optional comment field", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: validScores,
        submittedAt: new Date(),
      })
    );
  });

  it("rejects scores as flat numbers instead of a map", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "feedback_responses"), {
        sessionId: "session-abc123",
        orgId: ORG_ID,
        scores: "invalid",
        submittedAt: new Date(),
      })
    );
  });
});
