import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your LearnFast dashboard — manage sessions, review feedback, and track your development progress.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
