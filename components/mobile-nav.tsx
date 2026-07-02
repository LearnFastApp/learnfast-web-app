"use client";

import { useState } from "react";
import { BarChart3, Brain, Grid3X3, LayoutDashboard, Plus, Settings, Trophy, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface Props {
  onCreateSession?: () => void;
  locale?: "en" | "fr";
}

const MORE_PATHS = ["/feed", "/leaderboard", "/settings"];

export default function MobileNav({ onCreateSession, locale = "en" }: Props) {
  const pathname = usePathname();
  const isFr = locale === "fr";
  const [showMore, setShowMore] = useState(false);

  const moreItems = [
    { label: isFr ? "Feed coaching" : "Coaching Feed", icon: Users, href: "/feed" },
    { label: isFr ? "Classement" : "Leaderboard", icon: Trophy, href: "/leaderboard" },
    { label: isFr ? "Paramètres" : "Settings", icon: Settings, href: "/settings" },
  ];

  const moreActive = MORE_PATHS.includes(pathname);

  function navClass(path: string) {
    return `flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
      pathname === path ? "text-violet-400" : "text-slate-500 hover:text-white"
    }`;
  }

  return (
    <>
      {/* More sheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-[60px] left-0 right-0 bg-[#0f1424] border-t border-white/10 rounded-t-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-sm font-semibold text-white">{isFr ? "Plus" : "More"}</p>
              <button
                onClick={() => setShowMore(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pb-4 space-y-1">
              {moreItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    pathname === item.href
                      ? "bg-violet-500/20 text-violet-400"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {pathname === item.href && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0f1424] lg:hidden safe-bottom">
        <div className="flex items-center">
          <a href="/dashboard" className={navClass("/dashboard")}>
            <LayoutDashboard className="h-5 w-5" />
            {isFr ? "Accueil" : "Home"}
          </a>

          <a href="/analytics" className={navClass("/analytics")}>
            <BarChart3 className="h-5 w-5" />
            {isFr ? "Analytics" : "Analytics"}
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

          <a href="/ai-assessment" className={navClass("/ai-assessment")}>
            <Brain className="h-5 w-5" />
            {isFr ? "Analyse IA" : "AI"}
          </a>

          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
              showMore || moreActive ? "text-violet-400" : "text-slate-500 hover:text-white"
            }`}
          >
            <Grid3X3 className="h-5 w-5" />
            {isFr ? "Plus" : "More"}
          </button>
        </div>
      </nav>
    </>
  );
}
