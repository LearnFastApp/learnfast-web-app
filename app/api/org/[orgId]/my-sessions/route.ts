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

  const sessionsSnap = await db
    .collection(`organizations/${orgId}/sessions`)
    .where("presenterId", "==", uid)
    .orderBy("scheduledStart", "desc")
    .get();

  if (sessionsSnap.empty) {
    return NextResponse.json({
      sessions: [],
      overallAvg: null,
      totalSessions: 0,
      totalResponses: 0,
    });
  }

  const sessionDocs = sessionsSnap.docs;

  // feedback_responses are keyed by the CONSUMER session ID, not the org session ID
  const consumerIds = sessionDocs
    .map((d) => d.data().linkedConsumerSessionId as string | undefined)
    .filter((id): id is string => !!id);

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

  const sessions = sessionDocs.map((d) => {
    const data = d.data();
    const cid = data.linkedConsumerSessionId as string | undefined;
    const sessionResponses = cid ? (responsesByConsumerId.get(cid) ?? []) : [];
    return {
      id: d.id,
      title: data.title as string,
      type: data.type as string,
      status: data.status as string,
      scheduledStart: data.scheduledStart?.toDate?.()?.toISOString() ?? null,
      scheduledEnd: data.scheduledEnd?.toDate?.()?.toISOString() ?? null,
      linkedConsumerSessionId: cid ?? null,
      feedbackCode: data.feedbackCode as string,
      responsesCount: sessionResponses.length,
      avgScores: avgScoresFromResponses(sessionResponses),
    };
  });

  const allResponses = [...responsesByConsumerId.values()].flat();

  return NextResponse.json({
    sessions,
    overallAvg: avgScoresFromResponses(allResponses),
    totalSessions: sessions.length,
    totalResponses: allResponses.length,
  });
}
