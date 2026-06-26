import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In or Create Account",
  description: "Sign in to LearnFast or create a free account to start collecting real-time audience feedback on your presentations.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
