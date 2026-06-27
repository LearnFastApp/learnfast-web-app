import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { INDUSTRIES, industryLabel } from "@/lib/industries";

export const dynamic = "force-dynamic";

const ADMIN_UIDS = new Set(["zuFmYCIaGLViRSc7LXFwej6wql22"]);
const MIN_ENTRIES = 5;
const TOP_N = 25;
const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;

function overallScore(scores: Record<string, number>): number {
  const vals = DIMENSIONS.map((d) => scores[d] ?? 0);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function checkPaywall(uid: string, subscriptionStatus: string, pilotExpiry: Date | undefined): boolean {
  if (ADMIN_UIDS.has(uid)) return true;
  if (subscriptionStatus === "active") return true;
  if (subscriptionStatus === "pilot" && pilotExpiry && pilotExpiry > new Date()) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry") ?? "";
  const dimension = searchParams.get("dimension") ?? "overall";

  if (!industry || !INDUSTRIES.find((i) => i.value === industry)) {
    return NextResponse.json({ error: "Invalid industry" }, { status: 400 });
  }

  const db = getAdminDb();

  // Paywall check
  const presenterSnap = await db.collection("presenters").doc(uid).get();
  const presenterData = presenterSnap.data() ?? {};
  const pilotExpiry = presenterData.pilotExpiresAt?.toDate?.() as Date | undefined;
  if (!checkPaywall(uid, presenterData.subscriptionStatus as string, pilotExpiry)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  // Fetch all assessments for this industry
  const snap = await db.collection("ai_assessments")
    .where("industry", "==", industry)
    .get();

  // Filter complete, group by presenter, take most recent per presenter
  const byPresenter = new Map<string, { scores: Record<string, number>; createdAt: Date; id: string }>();
  for (const d of snap.docs) {
    const data = d.data();
    if (data.status !== "complete" || !data.scores) continue;
    const pid = data.presenterId as string;
    const createdAt = data.createdAt?.toDate?.() ?? new Date(0);
    const existing = byPresenter.get(pid);
    if (!existing || createdAt > existing.createdAt) {
      byPresenter.set(pid, { scores: data.scores, createdAt, id: d.id });
    }
  }

  const totalAssessments = byPresenter.size;

  // Fetch nicknames for all presenters in parallel
  const presenterIds = [...byPresenter.keys()];
  const nicknameMap = new Map<string, string>();
  await Promise.all(
    presenterIds.map(async (pid) => {
      const pSnap = await db.collection("presenters").doc(pid).get();
      const nick = pSnap.data()?.nickname as string | undefined;
      if (nick?.trim()) nicknameMap.set(pid, nick.trim());
    })
  );

  // Build scored entries (only presenters with nicknames appear on the board)
  const entries = presenterIds
    .filter((pid) => nicknameMap.has(pid))
    .map((pid) => {
      const { scores } = byPresenter.get(pid)!;
      const dimScore = dimension === "overall" ? overallScore(scores) : (scores[dimension] ?? 0);
      return {
        presenterId: pid,
        nickname: nicknameMap.get(pid)!,
        score: dimScore,
        scores,
        overall: overallScore(scores),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Assign ranks and percentiles
  const totalWithNickname = entries.length;
  const ranked = entries.map((e, i) => ({
    rank: i + 1,
    nickname: e.nickname,
    score: e.score,
    scores: e.scores,
    overall: e.overall,
    isCurrentUser: e.presenterId === uid,
    percentile: totalAssessments > 1
      ? Math.round(((totalAssessments - i) / totalAssessments) * 100)
      : 100,
  }));

  // Current user's stats
  const currentUserEntry = ranked.find((e) => e.isCurrentUser);
  const hasNickname = !!nicknameMap.get(uid);

  // Top N + always include current user if outside top N
  const topEntries = ranked.slice(0, TOP_N);
  const currentUserOutside = currentUserEntry && currentUserEntry.rank > TOP_N;

  const isAdmin = ADMIN_UIDS.has(uid);
  const belowThreshold = !isAdmin && totalAssessments < MIN_ENTRIES;

  return NextResponse.json({
    industry,
    industryLabel: industryLabel(industry, "en"),
    dimension,
    totalEntries: totalAssessments,
    totalWithNickname,
    belowThreshold,
    minEntries: MIN_ENTRIES,
    hasNickname,
    entries: topEntries,
    currentUserOutside: currentUserOutside ? currentUserEntry : null,
  });
}
