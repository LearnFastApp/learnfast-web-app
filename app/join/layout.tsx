import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a session — LearnFast",
  description: "Enter a session code to give real-time feedback to a presenter. Takes 30 seconds — no account needed.",
  openGraph: {
    title: "Join a LearnFast session",
    description: "Enter your session code to give feedback to a presenter in real time.",
    siteName: "LearnFast",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Join a LearnFast session",
    description: "Enter your session code to give real-time presenter feedback.",
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
