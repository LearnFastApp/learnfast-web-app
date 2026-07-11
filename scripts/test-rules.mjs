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
 *
 * presenters/{uid} self-service allowlist (added 2026-07-10 — closes a
 * billing-bypass hole where any client could self-write subscriptionStatus/orgId):
 *   ✓ Signup create with only allowlisted fields + subscriptionStatus:'free' succeeds
 *   ✓ Signup create attempting subscriptionStatus:'active' is rejected
 *   ✓ Signup create attempting to set orgId directly is rejected
 *   ✓ Profile update (displayName/nickname/locale/onboardingSeen) succeeds
 *   ✓ Update attempting to change subscriptionStatus is rejected
 *   ✓ Update attempting to set orgId is rejected
 *   ✓ Update attempting to set pilotExpiresAt is rejected
 *   ✓ A different user cannot write to someone else's presenter doc
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

// ── presenters/{uid} self-service allowlist ───────────────────────────────────

describe("presenters self-service allowlist", () => {
  it("signup create with only allowlisted fields + subscriptionStatus:'free' succeeds", async () => {
    const db = testEnv.authenticatedContext("uid-new-signup-1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "presenters/uid-new-signup-1"), {
        email: "new@example.com",
        displayName: "New User",
        subscriptionStatus: "free",
        locale: "en",
        industry: "tech",
        nickname: null,
        createdAt: new Date(),
      })
    );
  });

  it("signup create attempting subscriptionStatus:'active' is rejected", async () => {
    const db = testEnv.authenticatedContext("uid-new-signup-2").firestore();
    await assertFails(
      setDoc(doc(db, "presenters/uid-new-signup-2"), {
        email: "attacker@example.com",
        displayName: "Attacker",
        subscriptionStatus: "active",
        createdAt: new Date(),
      })
    );
  });

  it("signup create attempting to set orgId directly is rejected", async () => {
    const db = testEnv.authenticatedContext("uid-new-signup-3").firestore();
    await assertFails(
      setDoc(doc(db, "presenters/uid-new-signup-3"), {
        email: "attacker2@example.com",
        displayName: "Attacker2",
        orgId: ORG_ID,
        createdAt: new Date(),
      })
    );
  });

  it("profile update (displayName/nickname/locale/onboardingSeen) succeeds", async () => {
    const uid = "uid-existing-presenter-1";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `presenters/${uid}`), {
        email: "existing@example.com",
        displayName: "Existing User",
        subscriptionStatus: "free",
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertSucceeds(
      updateDoc(doc(db, `presenters/${uid}`), {
        displayName: "Updated Name",
        nickname: "Nicky",
        locale: "fr",
        onboardingSeen: true,
      })
    );
  });

  it("update attempting to change subscriptionStatus is rejected", async () => {
    const uid = "uid-existing-presenter-2";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `presenters/${uid}`), {
        email: "existing2@example.com",
        subscriptionStatus: "free",
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertFails(updateDoc(doc(db, `presenters/${uid}`), { subscriptionStatus: "active" }));
  });

  it("update attempting to set orgId is rejected", async () => {
    const uid = "uid-existing-presenter-3";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `presenters/${uid}`), {
        email: "existing3@example.com",
        subscriptionStatus: "free",
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertFails(updateDoc(doc(db, `presenters/${uid}`), { orgId: ORG_ID }));
  });

  it("update attempting to set pilotExpiresAt is rejected", async () => {
    const uid = "uid-existing-presenter-4";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `presenters/${uid}`), {
        email: "existing4@example.com",
        subscriptionStatus: "free",
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertFails(
      updateDoc(doc(db, `presenters/${uid}`), { pilotExpiresAt: new Date(), subscriptionStatus: "pilot" })
    );
  });

  it("a different user cannot write to someone else's presenter doc", async () => {
    const victimUid = "uid-victim-1";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `presenters/${victimUid}`), {
        email: "victim@example.com",
        subscriptionStatus: "free",
        createdAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext("uid-attacker-3").firestore();
    await assertFails(updateDoc(doc(db, `presenters/${victimUid}`), { displayName: "Hijacked" }));
  });
});

// ── Gameday Mode / Sprint Mode (speakingEvents, plans, prescribedSessions, cueCards) ─
// All four collections are created/mutated exclusively via /api/gameday/* admin-SDK
// routes — read is owner-scoped, write is `if false`, EXCEPT cueCards.lines, which
// must be client-editable at all times (including offline).

const GAMEDAY_OWNER_UID = "uid-gameday-owner-1";
const GAMEDAY_OTHER_UID = "uid-gameday-other-1";

describe("speakingEvents ownership", () => {
  const eventId = "event-1";

  before(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `speakingEvents/${eventId}`), {
        userId: GAMEDAY_OWNER_UID,
        title: "Q3 Board Update",
        eventDate: new Date(),
        contextType: "board_presentation",
        status: "active",
        createdAt: new Date(),
      });
    });
  });

  it("owner can read their own speakingEvent", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `speakingEvents/${eventId}`)));
  });

  it("a different user cannot read someone else's speakingEvent", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, `speakingEvents/${eventId}`)));
  });

  it("unauthenticated user cannot read a speakingEvent", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `speakingEvents/${eventId}`)));
  });

  it("client cannot create a speakingEvent directly (admin SDK only)", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, "speakingEvents/event-client-attempt"), {
        userId: GAMEDAY_OWNER_UID,
        title: "Sneaky",
        eventDate: new Date(),
        contextType: "general",
        status: "active",
        createdAt: new Date(),
      })
    );
  });

  it("owner cannot update a speakingEvent directly (admin SDK only)", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, `speakingEvents/${eventId}`), { status: "cancelled" }));
  });
});

describe("plans ownership", () => {
  const planId = "plan-1";

  before(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `plans/${planId}`), {
        eventId: "event-1",
        userId: GAMEDAY_OWNER_UID,
        mode: "sprint",
        runwayDays: 3,
        planVersion: 1,
        isCurrent: true,
        generatedAt: new Date(),
      });
    });
  });

  it("owner can read their own plan", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `plans/${planId}`)));
  });

  it("a different user cannot read someone else's plan", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, `plans/${planId}`)));
  });

  it("client cannot write a plan directly (admin SDK only, versioning enforced in app code)", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, `plans/${planId}`), { isCurrent: false }));
  });
});

describe("prescribedSessions ownership", () => {
  const sessionId = "prescribed-session-1";

  before(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `prescribedSessions/${sessionId}`), {
        planId: "plan-1",
        eventId: "event-1",
        userId: GAMEDAY_OWNER_UID,
        sessionType: "triage",
        ordinal: 0,
        status: "scheduled",
      });
    });
  });

  it("owner can read their own prescribed session", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `prescribedSessions/${sessionId}`)));
  });

  it("a different user cannot read someone else's prescribed session", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, `prescribedSessions/${sessionId}`)));
  });

  it("unauthenticated user cannot read a prescribed session", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `prescribedSessions/${sessionId}`)));
  });

  it("client cannot mark a prescribed session complete directly (admin SDK only)", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, `prescribedSessions/${sessionId}`), { status: "completed" }));
  });
});

describe("cueCards ownership and field-restricted edits", () => {
  const cardId = "cue-card-1";

  before(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `cueCards/${cardId}`), {
        planId: "plan-1",
        userId: GAMEDAY_OWNER_UID,
        lines: ["Open strong.", "Anchor one.", "Anchor two.", "Anchor three.", "Close strong."],
        taperAdvisory: false,
        updatedAt: new Date(),
      });
    });
  });

  it("owner can read their own cue card", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, `cueCards/${cardId}`)));
  });

  it("a different user cannot read someone else's cue card", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, `cueCards/${cardId}`)));
  });

  it("client cannot create a cue card directly (the one Anthropic-call route creates it)", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, "cueCards/cue-card-client-attempt"), {
        planId: "plan-1",
        userId: GAMEDAY_OWNER_UID,
        lines: ["a", "b", "c", "d", "e"],
        taperAdvisory: false,
        updatedAt: new Date(),
      })
    );
  });

  it("owner CAN edit lines directly — cue cards must be editable at all times, including offline", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, `cueCards/${cardId}`), {
        lines: ["New open.", "Anchor one.", "Anchor two.", "Anchor three.", "New close."],
        updatedAt: new Date(),
      })
    );
  });

  it("owner cannot use an update to reassign the card to a different plan/user", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, `cueCards/${cardId}`), { userId: GAMEDAY_OTHER_UID }));
  });

  it("a different user cannot edit someone else's cue card lines", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OTHER_UID).firestore();
    await assertFails(updateDoc(doc(db, `cueCards/${cardId}`), { lines: ["hijacked"] }));
  });

  it("cue cards cannot be deleted by the client", async () => {
    const db = testEnv.authenticatedContext(GAMEDAY_OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(db, `cueCards/${cardId}`)));
  });
});
