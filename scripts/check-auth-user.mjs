/**
 * Checks whether info@learnfastapp.com still exists in Firebase Auth,
 * and shows the presenter Firestore doc for that UID (if any).
 *
 * Usage:
 *   node scripts/check-auth-user.mjs
 *
 * To delete the auth user and clean up presenter doc, run with --fix:
 *   node scripts/check-auth-user.mjs --fix
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const TARGET_EMAIL = "info@learnfastapp.com";

// Initialise with ADC
initializeApp({ projectId: "learnfast-web-app" });
const auth = getAuth();
const db = getFirestore();

const fix = process.argv.includes("--fix");

async function run() {
  // 1. Check Firebase Auth
  let authUser = null;
  try {
    authUser = await auth.getUserByEmail(TARGET_EMAIL);
    console.log("Firebase Auth user found:");
    console.log("  UID:", authUser.uid);
    console.log("  Email:", authUser.email);
    console.log("  Providers:", authUser.providerData.map((p) => p.providerId));
    console.log("  Created:", new Date(authUser.metadata.creationTime).toISOString());
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      console.log("Firebase Auth: NO user found for", TARGET_EMAIL);
    } else {
      console.error("Error looking up auth user:", err.message);
    }
  }

  // 2. Check presenter doc (if UID is known)
  if (authUser) {
    const presSnap = await db.doc(`presenters/${authUser.uid}`).get();
    if (presSnap.exists) {
      console.log("\npresenters/" + authUser.uid, "doc:");
      console.log(JSON.stringify(presSnap.data(), null, 2));
    } else {
      console.log("\npresenters/" + authUser.uid, "doc: does NOT exist");
    }
  }

  // 3. Also search presenters by email field (in case UID differs)
  const emailSnap = await db
    .collection("presenters")
    .where("email", "==", TARGET_EMAIL)
    .get();
  if (!emailSnap.empty) {
    console.log("\nPresenter docs with email ==", TARGET_EMAIL + ":");
    emailSnap.forEach((d) => {
      console.log("  doc:", d.id, JSON.stringify(d.data(), null, 2));
    });
  } else {
    console.log("\nNo presenter doc with email ==", TARGET_EMAIL);
  }

  // 4. Check invites with this email across all orgs
  const inviteSnap = await db
    .collectionGroup("invites")
    .where("email", "==", TARGET_EMAIL)
    .get();
  if (!inviteSnap.empty) {
    console.log("\nInvite docs for", TARGET_EMAIL + ":");
    inviteSnap.forEach((d) => {
      console.log("  doc:", d.ref.path, JSON.stringify(d.data(), null, 2));
    });
  } else {
    console.log("\nNo invite docs for", TARGET_EMAIL);
  }

  // 5. Fix mode: delete auth user + clear presenter orgId
  if (fix && authUser) {
    console.log("\n--- FIX MODE ---");
    await auth.deleteUser(authUser.uid);
    console.log("Deleted Firebase Auth user", authUser.uid);

    const presRef = db.doc(`presenters/${authUser.uid}`);
    const presSnap2 = await presRef.get();
    if (presSnap2.exists) {
      await presRef.update({ orgId: null, orgRole: null });
      console.log("Cleared orgId/orgRole on presenter doc");
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
