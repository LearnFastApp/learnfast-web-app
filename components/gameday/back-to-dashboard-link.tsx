"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

export default function BackToDashboardLink() {
  const t = useTranslations("gameday");

  return (
    <a
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
    >
      <ArrowLeft className="h-4 w-4" />
      {t.backToDashboardLink}
    </a>
  );
}
