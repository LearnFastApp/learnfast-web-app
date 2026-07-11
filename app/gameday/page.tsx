import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isGamedayModeEnabled } from "@/lib/feature-flags";
import GamedayEntryForm from "@/components/gameday/gameday-entry-form";

export const metadata: Metadata = {
  title: "Gameday",
};

export default function GamedayPage() {
  if (!isGamedayModeEnabled()) notFound();

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center p-4">
      <GamedayEntryForm />
    </div>
  );
}
