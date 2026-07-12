import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import GamedayEntryForm from "@/components/gameday/gameday-entry-form";
import GamedayIntro from "@/components/gameday/gameday-intro";
import BackToDashboardLink from "@/components/gameday/back-to-dashboard-link";

export const metadata: Metadata = {
  title: "Gameday",
};

export default function GamedayPage() {
  if (!isGamedayModeEnabled()) notFound();

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center p-4 pt-12 pb-12 gap-6">
      <div className="w-full max-w-lg">
        <BackToDashboardLink />
      </div>
      <GamedayIntro />
      <GamedayEntryForm />
    </div>
  );
}
