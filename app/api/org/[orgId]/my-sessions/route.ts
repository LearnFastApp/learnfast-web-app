import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Dim = "clarity" | "energy" | "engagement" | "understanding" | "connection";
const DIMS: Dim[] = ["clarity", "energy", "engagement", "understanding", "connection"];

type Params = { params: Promise<{ orgId: string }> };

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avgScoresFromResponses(
  responses: FirebaseFirestore.QueryDocumentSnapshot[],
): Record<Dim, number> | null {
  if (responses.length === 0) return null;
  const sums: Record<Dim, number> = {
    clarity: 0,
    energy: 0,
    engagement: 0,
    understanding: 0,
    connection: 0,
  };
  let count = 0;
  for (const r of responses) {
    const d = r.data();
    const valid = DIMS.every((dim) => typeof d[dim] === "number");
    if (!valid) continue;
    for (const dim of DIMS) {
      sums[dim] += d[dim] as number;
    }
    count++;
  }
  if (count === 0) return null;
  return {
    clarity: roundTo1(sums.clarity / count),
    energy: roundTo1(sums.energy / count),
    engagement: roundTo1(sums.engagement / count),
    understanding: roundTo1(sums.understanding / count),
    connection: roundTo1(sums.connection / count),
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getAdminDb();

  // Fetch sessions where uid is lead presenter OR a co-presenter
  const [leadSnap, coPresSnap] = await Promise.all([
    db
      .collection(`organizations/${orgId}/sessions`)
      .where("presenterId", "==", uid)
      .orderBy("scheduledStart", "desc")
      .get(),
    db
      .collection(`organizations/${orgId}/sessions`)
      .where("copresenterIds", "array-contains", uid)
      .orderBy("scheduledStart", "desc")
      .get(),
  ]);

  // Merge and deduplicate (a user cannot be both lead and co-presenter, but guard anyway)
  const seen = new Set<string>();
  const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const doc of [...leadSnap.docs, ...coPresSnap.docs]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      allDocs.push(doc);
    }
  }
  // Sort merged list by scheduledStart descending
  allDocs.sort((a, b) => {
    const aTime = a.data().scheduledStart?.toDate?.()?.getTime() ?? 0;
    const bTime = b.data().scheduledStart?.toDate?.()?.getTime() ?? 0;
    return bTime - aTime;
  });

  if (allDocs.length === 0) {
    return NextResponse.json({
      sessions: [],
      overallAvg: null,
      totalSessions: 0,
      totalResponses: 0,
    });
  }

  // Collect consumer session IDs
  const consumerIds = allDocs
    .map((d) => d.data().linkedConsumerSessionId as string | undefined)
    .filter((id): id is string => !!id);

  // Fetch all feedback_responses for these consumer sessions
  const responsesByConsumerId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  if (consumerIds.length > 0) {
    const idChunks = chunkArray(consumerIds, 30);
    const responseChunks = await Promise.all(
      idChunks.map((chunk) =>
        db.collection("feedback_responses").where("sessionId", "in", chunk).get(),
      ),
    );
    for (const snap of responseChunks) {
      for (const doc of snap.docs) {
        const cid = doc.data().sessionId as string;
        if (!responsesByConsumerId.has(cid)) responsesByConsumerId.set(cid, []);
        responsesByConsumerId.get(cid)!.push(doc);
      }
    }
  }

  const sessions = allDocs.map((d) => {
    const data = d.data();
    const cid = data.linkedConsumerSessionId as string | undefined;
    const hasCoPresenters =
      Array.isArray(data.copresenterIds) && data.copresenterIds.length > 0;
    const isCoPresenter = Array.isArray(data.copresenterIds) && data.copresenterIds.includes(uid);

    let sessionResponses = cid ? (responsesByConsumerId.get(cid) ?? []) : [];

    // If session has co-presenters, filter responses to only those directed at this user
    if (hasCoPresenters) {
      sessionResponses = sessionResponses.filter(
        (r) => r.data().selectedPresenterId === uid,
      );
    } else if (isCoPresenter) {
      // Fallback: if somehow marked as co-presenter but no copresenterIds array
      sessionResponses = sessionResponses.filter(
        (r) => r.data().selectedPresenterId === uid,
      );
    }

    return {
      id: d.id,
      title: data.title as string,
      type: data.type as string,
      status: data.status as string,
      scheduledStart: data.scheduledStart?.toDate?.()?.toISOString() ?? null,
      scheduledEnd: data.scheduledEnd?.toDate?.()?.toISOString() ?? null,
      linkedConsumerSessionId: cid ?? null,
      feedbackCode: data.feedbackCode as string,
      isCoPresenter,
      copresenters: (data.copresenters ?? []) as Array<{ uid: string; displayName: string }>,
      responsesCount: sessionResponses.length,
      avgScores: avgScoresFromResponses(sessionResponses),
    };
  });

  const allMyResponses = sessions.flatMap((s) => {
    const cid = s.linkedConsumerSessionId;
    if (!cid) return [];
    const all = responsesByConsumerId.get(cid) ?? [];
    if (s.copresenters.length > 0) {
      return all.filter((r) => r.data().selectedPresenterId === uid);
    }
    return all;
  });

  return NextResponse.json({
    sessions,
    overallAvg: avgScoresFromResponses(allMyResponses),
    totalSessions: sessions.length,
    totalResponses: allMyResponses.length,
  });
}
