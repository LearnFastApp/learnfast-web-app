"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function ShareProfileButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
      style={{
        backgroundColor: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
        color: copied ? "#34d399" : "#94a3b8",
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Copy profile link"}
    </button>
  );
}
