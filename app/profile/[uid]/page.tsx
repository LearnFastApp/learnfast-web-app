import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import { DIMS, calculateRank, topDimension } from "@/lib/rank";
import { ProfileCardFull, type ProfileData } from "@/components/profile-card";
import ShareProfileButton from "@/components/share-profile-button";
import type { Metadata } from "next";

async function getProfile(uid: string): Promise<ProfileData | null> {
  const db = getAdminDb();

  const presenterSnap = await db.collection("presenters").doc(uid).get();
  if (!presenterSnap.exists) return null;

  const presenter = presenterSnap.data()!;
  if (!presenter.profileComplete) return null;

  const [assessmentsSnap, sessionsAgg] = await Promise.all([
    db.collection("ai_assessments")
      .where("presenterId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
    db.collection("sessions").where("presenterId", "==", uid).count().get(),
  ]);

  const assessments = assessmentsSnap.docs.map((d) => d.data());
  const assessmentCount = assessments.length;
  const sessionCount = sessionsAgg.data().count as number;

  const avgScores: Record<string, number> = {};
  if (assessmentCount > 0) {
    for (const dim of DIMS) {
      const values = assessments
        .map((a) => (a.scores as Record<string, number> | null)?.[dim])
        .filter((v): v is number => typeof v === "number");
      if (values.length > 0) {
        avgScores[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
    }
  }

  const avgOverall =
    assessmentCount > 0 && Object.keys(avgScores).length === DIMS.length
      ? Math.round(Object.values(avgScores).reduce((a, b) => a + b, 0) / DIMS.length)
      : 0;

  return {
    uid,
    displayName:    (presenter.displayName as string)    ?? null,
    jobTitle:       (presenter.jobTitle as string)       ?? null,
    industry:       (presenter.industry as string)       ?? null,
    location:       (presenter.location as string)       ?? null,
    focusDimension: (presenter.focusDimension as string) ?? null,
    profileComplete: true,
    avgScores:      assessmentCount > 0 ? avgScores : null,
    avgOverall:     assessmentCount > 0 ? avgOverall : null,
    assessmentCount,
    sessionCount,
    rank:           calculateRank(sessionCount, avgOverall),
    topDimension:   assessmentCount > 0 ? topDimension(avgScores) : null,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ uid: string }> }
): Promise<Metadata> {
  const { uid } = await params;
  const profile = await getProfile(uid);
  if (!profile) return { title: "Profile not found — LearnFast" };

  const name = profile.displayName ?? "Presenter";
  const rank = profile.rank.name;
  const role = profile.jobTitle ? ` · ${profile.jobTitle}` : "";

  return {
    title: `${name} — ${rank}${role} | LearnFast`,
    description: `${name} is a ${rank}-ranked presenter on LearnFast${profile.avgOverall ? ` with an avg score of ${profile.avgOverall}/100` : ""}.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const profile = await getProfile(uid);
  if (!profile) notFound();

  const profileUrl = `https://app.learnfastapp.com/profile/${uid}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ backgroundColor: "#05070d" }}>
      {/* Wordmark */}
      <a href="/" className="mb-10 block">
        <p
          className="text-sm font-black tracking-widest uppercase"
          style={{ color: "#e63946", letterSpacing: "0.3em" }}
        >
          LEARNFAST
        </p>
      </a>

      {/* Card */}
      <ProfileCardFull data={profile} />

      {/* Actions */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <ShareProfileButton url={profileUrl} />
        <a
          href="/"
          className="text-xs transition"
          style={{ color: "rgba(148,163,184,0.5)" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.8)")}
          onMouseOut={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
        >
          Build your presenter profile on LearnFast →
        </a>
      </div>

      {/* Footer */}
      <p className="mt-16 text-[10px]" style={{ color: "rgba(255,255,255,0.1)" }}>
        Scores based on real audience feedback · AI-analysed across five dimensions
      </p>
    </main>
  );
}
