"use client";

import { BarChart3, LayoutDashboard, Plus, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

interface Props {
  onCreateSession?: () => void;
  locale?: "en" | "fr";
}

export default function MobileNav({ onCreateSession, locale = "en" }: Props) {
  const pathname = usePathname();
  const isFr = locale === "fr";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0f1424] lg:hidden safe-bottom">
      <div className="flex items-center">
        <a
          href="/dashboard"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
            pathname === "/dashboard" ? "text-violet-400" : "text-slate-500 hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          {isFr ? "Tableau de bord" : "Dashboard"}
        </a>

        <a
          href="/analytics"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
            pathname === "/analytics" ? "text-violet-400" : "text-slate-500 hover:text-white"
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          {isFr ? "Analytiques" : "Analytics"}
        </a>

        {onCreateSession && (
          <div className="flex flex-1 justify-center">
            <button
              onClick={onCreateSession}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 shadow-lg shadow-violet-500/30 hover:bg-violet-400 transition"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        )}

        <a
          href="/settings"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
            pathname === "/settings" ? "text-violet-400" : "text-slate-500 hover:text-white"
          }`}
        >
          <Settings className="h-5 w-5" />
          {isFr ? "Paramètres" : "Settings"}
        </a>
      </div>
    </nav>
  );
}
