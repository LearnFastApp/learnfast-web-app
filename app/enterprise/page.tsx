import type { Metadata } from "next";
import EnterprisePage from "@/components/enterprise-page";

export const metadata: Metadata = {
  title: "LearnFast Enterprise — Team Communication Coaching at Scale",
  description:
    "Give every presenter in your organisation instant, anonymous audience feedback. LearnFast Enterprise tracks communication skills across your whole team — with analytics, coaching integrations, and per-seat billing.",
  openGraph: {
    title: "LearnFast Enterprise — Team Communication Coaching at Scale",
    description:
      "Real-time presentation feedback for enterprise teams. Anonymous scores, radar charts, and longitudinal skill tracking — no app download required.",
  },
};

export default function Page() {
  return <EnterprisePage />;
}
