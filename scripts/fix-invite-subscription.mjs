/**
 * Finds all presenter docs for a given email and upgrades their
 * subscriptionStatus to "lite" if they are currently on "free".
 *
 * Run from the project directory:
 *   node scripts/fix-invite-subscription.mjs
 *
 * Or to target a different email:
 *   EMAIL=other@example.com node scripts/fix-invite-subscription.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const TARGET_EMAIL = process.env.EMAIL ?? "info@learnfastapp.com";

initializeApp({ projectId: "learnfast-app-cc98c" });
const db = getFirestore();

async function run() {
  const snap = await db
    .collection("presenters")
    .where("email", "==", TARGET_EMAIL)
    .get();

  if (snap.empty) {
    console.log("No presenter docs found for", TARGET_EMAIL);
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const current = data.subscriptionStatus ?? "free";
    console.log(`Doc ${doc.id}: subscriptionStatus = ${current}, orgId = ${data.orgId ?? "none"}`);

    if (current === "free") {
      await doc.ref.update({ subscriptionStatus: "lite" });
      console.log(`  ✅ Updated to "lite"`);
    } else {
      console.log(`  — No change needed`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
