import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics — Performance Trends",
  description: "Track your presentation performance trends across sessions. See how your scores in clarity, engagement, energy, understanding and connection evolve over time.",
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
