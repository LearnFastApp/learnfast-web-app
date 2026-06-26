import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Hub",
  robots: { index: false, follow: false },
};

export default function LearningHubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
