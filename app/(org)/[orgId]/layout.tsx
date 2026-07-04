import { getAdminDb } from "@/lib/firebase-admin";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  let brandColor: string | null = null;
  try {
    const db = getAdminDb();
    const snap = await db.doc(`organizations/${orgId}`).get();
    brandColor = (snap.data()?.brandColor as string | undefined) ?? null;
  } catch {
    // No color — fall back to default violet
  }

  const accent = brandColor ?? "#8b5cf6";

  // Derive a lighter tint (15% opacity) for active nav background
  const hex = accent.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const tint = `rgba(${r}, ${g}, ${b}, 0.15)`;

  return (
    <>
      <style>{`
        :root {
          --org-accent: ${accent};
          --org-accent-tint: ${tint};
        }
      `}</style>
      {children}
    </>
  );
}
