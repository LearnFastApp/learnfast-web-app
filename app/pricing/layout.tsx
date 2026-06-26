import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free, Lite & Pro Plans",
  description: "Start free with 2 sessions, then upgrade to Lite for £3.99/month with unlimited sessions, full analytics, and personalised learning resources. 7-day free trial.",
  robots: { index: false, follow: false },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
