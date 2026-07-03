import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Dim = "clarity" | "energy" | "engagement" | "understanding" | "connection";
const DIMS: Dim[] = ["clarity", "energy", "engagement", "understanding", "connection"];

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function avgScores(
  responses: Array<{ scores: Partial<Record<Dim, number>> }>,
): Record<Dim, number> | null {
  if (responses.length === 0) return null;
  const sums: Record<Dim, number> = { clarity: 0, energy: 0, engagement: 0, understanding: 0, connection: 0 };
  const counts: Record<Dim, number> = { clarity: 0, energy: 0, engagement: 0, understanding: 0, connection: 0 };
  for (const r of responses) {
    for (const dim of DIMS) {
      const v = r.scores[dim];
      if (typeof v === "number") {
        sums[dim] += v;
        counts[dim]++;
      }
    }
  }
  const result = {} as Record<Dim, number>;
  for (const dim of DIMS) {
    result[dim] = counts[dim] > 0 ? Math.round((sums[dim] / counts[dim]) * 10) / 10 : 0;
  }
  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "coach")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();

  const [sessionsSnap, membersSnap] = await Promise.all([
    db
      .collection(`organizations/${orgId}/sessions`)
      .orderBy("scheduledStart", "desc")
      .get(),
    db
      .collection(`organizations/${orgId}/members`)
      .where("status", "==", "active")
      .get(),
  ]);

  const allSessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));
  const completedSessions = allSessions.filter(
    (s) => s.status === "completed" || s.status === "live",
  );
  const scheduledCount = allSessions.filter((s) => s.status === "scheduled").length;

  const consumerIds = completedSessions
    .map((s) => s.linkedConsumerSessionId as string | null | undefined)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  let allResponses: Array<{ sessionId: string; scores: Partial<Record<Dim, number>> }> = [];

  if (consumerIds.length > 0) {
    const chunks = chunkArray(consumerIds, 30);
    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        db
          .collection("feedback_responses")
          .where("sessionId", "in", chunk)
          .get(),
      ),
    );
    for (const snap of chunkResults) {
      for (const doc of snap.docs) {
        const data = doc.data();
        allResponses.push({ sessionId: data.sessionId, scores: data.scores ?? {} });
      }
    }
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthSessionPresenterIds = new Set<string>(
    completedSessions
      .filter((s) => {
        const raw = s.scheduledStart as { toDate?: () => Date } | null | undefined;
        const d = typeof raw?.toDate === "function" ? raw.toDate() : null;
        return d !== null && d >= monthStart;
      })
      .map((s) => s.presenterId as string)
      .filter(Boolean),
  );

  const responsesByConsumerId = new Map<string, typeof allResponses>();
  for (const r of allResponses) {
    const arr = responsesByConsumerId.get(r.sessionId) ?? [];
    arr.push(r);
    responsesByConsumerId.set(r.sessionId, arr);
  }

  const consumerIdByOrgSessionId = new Map<string, string>(
    completedSessions
      .filter((s) => typeof s.linkedConsumerSessionId === "string")
      .map((s) => [s.id, s.linkedConsumerSessionId as string]),
  );

  const memberDocs = membersSnap.docs;

  const members = memberDocs.map((d) => {
    const data = d.data();
    const memberId = d.id;

    const memberSessions = completedSessions.filter((s) => s.presenterId === memberId);
    const memberConsumerIds = memberSessions
      .map((s) => consumerIdByOrgSessionId.get(s.id))
      .filter((id): id is string => typeof id === "string");

    const memberResponses = memberConsumerIds.flatMap(
      (cid) => responsesByConsumerId.get(cid) ?? [],
    );

    const lastSession = memberSessions[0];
    let lastSessionAt: string | null = null;
    if (lastSession) {
      const raw = lastSession.scheduledStart as { toDate?: () => Date } | null | undefined;
      const d = typeof raw?.toDate === "function" ? raw.toDate() : null;
      lastSessionAt = d ? d.toISOString() : null;
    }

    return {
      id: memberId,
      displayName: (data.displayName as string | undefined) ?? (data.email as string | undefined) ?? memberId,
      email: (data.email as string | undefined) ?? "",
      role: data.role as string,
      sessionsCount: memberSessions.length,
      responsesCount: memberResponses.length,
      avgScores: avgScores(memberResponses),
      lastSessionAt,
    };
  });

  return NextResponse.json({
    overview: {
      sessionsCount: completedSessions.length,
      scheduledCount,
      responsesCount: allResponses.length,
      activeMembersCount: thisMonthSessionPresenterIds.size,
      totalMembersCount: memberDocs.length,
    },
    orgAvgScores: avgScores(allResponses),
    members,
  });
}
