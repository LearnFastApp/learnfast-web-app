import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { classifyArchetype, ARCHETYPE_DEFS } from "@/lib/archetypes";
import {
  sendGuestNurtureDay2Email,
  sendGuestNurtureDay5Email,
} from "@/lib/email";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL ?? "https://learnfastapp.com";

const DIM_LABELS: Record<string, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const day2Threshold = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const day5Threshold = new Date(now - 5 * 24 * 60 * 60 * 1000);

  // Fetch unclaimed complete guest assessments still in nurture sequence
  const snap = await db.collection("ai_assessments")
    .where("isGuest", "==", true)
    .where("claimedByUid", "==", null)
    .where("status", "==", "complete")
    .get();

  let day2Sent = 0;
  let day5Sent = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const createdAt: Date | undefined = data.createdAt?.toDate?.();
    if (!createdAt) continue;

    const guestEmail = data.guestEmail as string | undefined;
    const guestToken = data.guestToken as string | undefined;
    const emailSequenceDay = (data.emailSequenceDay as number) ?? 0;
    if (!guestEmail || !guestToken) continue;

    const resultsUrl = `${APP_URL}/try/${guestToken}`;

    try {
      if (emailSequenceDay === 0 && createdAt <= day2Threshold) {
        // Day 2: archetype reveal
        const scores = data.scores as Record<string, number> | null;
        if (!scores) continue;

        const archKey = classifyArchetype(scores as Parameters<typeof classifyArchetype>[0], null);
        const arch = ARCHETYPE_DEFS[archKey];
        const sortedDims = Object.entries(scores).sort((a, b) => a[1] - b[1]);
        const [lowestKey, lowestScore] = sortedDims[0];

        await sendGuestNurtureDay2Email({
          to: guestEmail,
          resultsUrl,
          archetypeName: arch.name.en,
          archetypeEmoji: arch.emoji,
          archetypeTagline: arch.tagline.en,
          lowestDimension: DIM_LABELS[lowestKey] ?? lowestKey,
          lowestScore: Math.round(lowestScore),
        });
        await docSnap.ref.update({ emailSequenceDay: 2 });
        day2Sent++;
      } else if (emailSequenceDay === 2 && createdAt <= day5Threshold) {
        // Day 5: conversion push
        await sendGuestNurtureDay5Email(guestEmail, resultsUrl);
        await docSnap.ref.update({ emailSequenceDay: 5 });
        day5Sent++;
      }
    } catch (err) {
      console.error(`[cron/guest-nurture] Failed for ${docSnap.id}:`, err);
    }
  }

  return NextResponse.json({ day2Sent, day5Sent, checked: snap.size });
}
