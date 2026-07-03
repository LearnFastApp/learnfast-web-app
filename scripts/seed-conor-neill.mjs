/**
 * Adds Conor Neill "How to Start a Speech" resources to library_content.
 * Run from project root: node scripts/seed-conor-neill.mjs
 * Requires Firebase ADC: run `firebase login` or `gcloud auth application-default login` first.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({ projectId: "learnfast-app-cc98c" });
}

const db = getFirestore();
const ADMIN_UID = "zuFmYCIaGLViRSc7LXFwej6wql22";

const items = [
  {
    title: "How to Start a Speech",
    description:
      "Conor Neill (IESE Business School, 4M+ TEDx views) breaks down exactly how to open a talk. The 3 worst openers: self-introduction ('My name is…'), tech checks ('Can everyone hear me?'), and restating what's in the programme. The 3 best: (3rd) ask a question the audience genuinely cares about; (2nd) hit them with a surprising fact that challenges assumptions; (1st — and best) tell a story. Stories work because they're about people, not objects. The adult version of 'once upon a time' — connect personally to why this topic matters to you, including sacrifices made or lives changed.",
    type: "video",
    url: "https://www.youtube.com/watch?v=w82a1FT5o88",
    dimension: "engagement",
    isPremium: true,
    isVisible: true,
    orgId: null,
    storageRef: null,
    fileUrl: null,
    fileName: null,
    createdBy: ADMIN_UID,
    createdAt: FieldValue.serverTimestamp(),
  },
  {
    title: "The 3 Best Ways to Open Any Talk",
    description:
      "A practical guide distilled from Conor Neill's teaching. Ranked from good to best: (3) The Question — frame a problem your audience already feels, not a rhetorical filler. (2) The Shocking Fact — a statistic or truth that makes people rethink a belief they hold ('More people alive today than have ever died'; 'One hour of sunlight on Earth equals a year of human energy use'). (1) The Story — the single most powerful opener. It's personal, human, and pulls people in before they decide to tune out. Aim for a story about a moment — not an abstract summary.",
    type: "link",
    url: "https://conorneill.com/improve-your-speaking/",
    dimension: "engagement",
    isPremium: true,
    isVisible: true,
    orgId: null,
    storageRef: null,
    fileUrl: null,
    fileName: null,
    createdBy: ADMIN_UID,
    createdAt: FieldValue.serverTimestamp(),
  },
  {
    title: "Why Storytelling Beats Data Every Time",
    description:
      "Conor Neill's core insight: audiences connect with people, not objects. A story grounds your idea in human experience. Start with the moment — a specific scene, a specific person, a turning point. Then link it to your message. This isn't just rhetoric: it's how the brain processes information. Facts sit in working memory. Stories activate pattern recognition, emotion, and long-term retention. The best communicators don't eliminate data — they wrap it in narrative so it sticks.",
    type: "link",
    url: "https://conorneill.com/improve-your-speaking/",
    dimension: "connection",
    isPremium: true,
    isVisible: true,
    orgId: null,
    storageRef: null,
    fileUrl: null,
    fileName: null,
    createdBy: ADMIN_UID,
    createdAt: FieldValue.serverTimestamp(),
  },
  {
    title: "The 3 Openers That Kill Your Credibility Instantly",
    description:
      "Conor Neill's warning list — avoid these every time. (1) Self-introduction: when you open with 'Hi, I'm [name]…', the audience mentally leaves. They already know who you are or they don't care yet — earn it first. (2) The tech check: asking if mics or slides are working signals you're not prepared. Sort it before you start. (3) Restating the programme: if it's already printed, saying it out loud wastes the audience's time and signals you have nothing new to add. Open with something that makes them glad they stayed.",
    type: "link",
    url: "https://conorneill.com/improve-your-speaking/",
    dimension: "clarity",
    isPremium: true,
    isVisible: true,
    orgId: null,
    storageRef: null,
    fileUrl: null,
    fileName: null,
    createdBy: ADMIN_UID,
    createdAt: FieldValue.serverTimestamp(),
  },
];

async function run() {
  for (const item of items) {
    const ref = await db.collection("library_content").add(item);
    console.log(`✅ Added: "${item.title}" [${item.dimension}] → ${ref.id}`);
  }
  console.log(`\nDone — ${items.length} items added to library_content.`);
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
