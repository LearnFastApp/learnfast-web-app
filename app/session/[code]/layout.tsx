import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rate this session — LearnFast",
  description: "Give real-time feedback on this presentation. Takes 30 seconds — your scores help the presenter know exactly where to improve.",
  openGraph: {
    title: "Rate this presentation",
    description: "Give real-time feedback in 30 seconds. Your input helps presenters grow.",
    siteName: "LearnFast",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Rate this presentation — LearnFast",
    description: "Give real-time feedback in 30 seconds.",
  },
};

export default function SessionFeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
