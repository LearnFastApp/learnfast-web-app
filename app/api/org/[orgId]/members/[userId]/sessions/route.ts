import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyAuthToken } from "@/lib/firebase-admin";
import { getOrgContext, hasOrgPermission } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Dim = "clarity" | "energy" | "engagement" | "understanding" | "connection";
const DIMS: Dim[] = ["clarity", "energy", "engagement", "understanding", "connection"];

type Params = { params: Promise<{ orgId: string; userId: string }> };

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function roundTo1(n: number) { return Math.round(n * 10) / 10; }

function avgScores(responses: FirebaseFirestore.QueryDocumentSnapshot[]): Record<Dim, number> | null {
  if (responses.length === 0) return null;
  const sums = { clarity: 0, energy: 0, engagement: 0, understanding: 0, connection: 0 };
  let count = 0;
  for (const r of responses) {
    const d = r.data();
    if (!DIMS.every((dim) => typeof d[dim] === "number")) continue;
    for (const dim of DIMS) sums[dim] += d[dim] as number;
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
  const { orgId, userId } = await params;

  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getOrgContext(uid);
  if (!ctx || ctx.orgId !== orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasOrgPermission(ctx.role, "coach")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getAdminDb();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  const canView = orgSnap.data()?.settings?.managerCanViewIndividualSessions === true;
  if (!canView) return NextResponse.json({ error: "individual_sessions_disabled" }, { status: 403 });

  // Verify target user is a member of this org
  const memberSnap = await db.doc(`organizations/${orgId}/members/${userId}`).get();
  if (!memberSnap.exists) return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  const memberData = memberSnap.data()!;

  const [leadSnap, coPresSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/sessions`)
      .where("presenterId", "==", userId)
      .orderBy("scheduledStart", "desc")
      .get(),
    db.collection(`organizations/${orgId}/sessions`)
      .where("copresenterIds", "array-contains", userId)
      .orderBy("scheduledStart", "desc")
      .get(),
  ]);

  const seen = new Set<string>();
  const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const doc of [...leadSnap.docs, ...coPresSnap.docs]) {
    if (!seen.has(doc.id)) { seen.add(doc.id); allDocs.push(doc); }
  }
  allDocs.sort((a, b) => {
    const aTime = a.data().scheduledStart?.toDate?.()?.getTime() ?? 0;
    const bTime = b.data().scheduledStart?.toDate?.()?.getTime() ?? 0;
    return bTime - aTime;
  });

  if (allDocs.length === 0) {
    return NextResponse.json({
      member: { displayName: memberData.displayName ?? memberData.email ?? userId, email: memberData.email ?? "", role: memberData.role },
      sessions: [], overallAvg: null, totalSessions: 0, totalResponses: 0,
    });
  }

  const consumerIds = allDocs
    .map((d) => d.data().linkedConsumerSessionId as string | undefined)
    .filter((id): id is string => !!id);

  const responsesByConsumerId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  if (consumerIds.length > 0) {
    const chunks = await Promise.all(
      chunkArray(consumerIds, 30).map((chunk) =>
        db.collection("feedback_responses").where("sessionId", "in", chunk).get()
      )
    );
    for (const snap of chunks) {
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
    const hasCoPresenters = Array.isArray(data.copresenterIds) && data.copresenterIds.length > 0;
    let sessionResponses = cid ? (responsesByConsumerId.get(cid) ?? []) : [];
    if (hasCoPresenters) {
      sessionResponses = sessionResponses.filter((r) => r.data().selectedPresenterId === userId);
    }
    return {
      id: d.id,
      title: data.title as string,
      type: data.type as string,
      status: data.status as string,
      scheduledStart: data.scheduledStart?.toDate?.()?.toISOString() ?? null,
      linkedConsumerSessionId: cid ?? null,
      responsesCount: sessionResponses.length,
      avgScores: avgScores(sessionResponses),
    };
  });

  const allResponses = sessions.flatMap((s) => {
    const cid = s.linkedConsumerSessionId;
    return cid ? (responsesByConsumerId.get(cid) ?? []) : [];
  });

  return NextResponse.json({
    member: {
      displayName: memberData.displayName ?? memberData.email ?? userId,
      email: memberData.email ?? "",
      role: memberData.role,
    },
    sessions,
    overallAvg: avgScores(allResponses),
    totalSessions: sessions.length,
    totalResponses: allResponses.length,
  });
}
