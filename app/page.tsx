import type { Metadata } from "next";
import LandingPage from "@/components/landing-page";

export const metadata: Metadata = {
  title: "LearnFast — Real-Time Presentation Feedback for Leaders",
  description:
    "LearnFast lets your whole audience score your presentation anonymously in real time. Get a radar chart of your scores across clarity, engagement, energy, understanding and connection — the moment you sit down. Free to start. No app download required.",
  openGraph: {
    title: "LearnFast — Real-Time Presentation Feedback for Leaders",
    description:
      "Your whole audience scores you anonymously. Live radar chart. Personalised learning resources. No app download needed.",
  },
};

export default function Home() {
  return <LandingPage />;
}
