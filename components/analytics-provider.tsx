"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
const CONSENT_KEY = "lf_analytics_consent";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function trackPageView(path: string) {
  if (typeof window !== "undefined" && window.gtag && GA_ID) {
    window.gtag("config", GA_ID, { page_path: path });
  }
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted") setConsent("granted");
    else if (stored === "denied") setConsent("denied");
  }, []);

  useEffect(() => {
    if (consent === "granted") trackPageView(pathname);
  }, [pathname, consent]);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "granted");
    setConsent("granted");
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "denied");
    setConsent("denied");
  }

  return (
    <>
      {consent === "granted" && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'update', {
              analytics_storage: 'granted'
            });
            gtag('config', '${GA_ID}', { anonymize_ip: true });
          `}</Script>
        </>
      )}

      {consent === null && (
        <div className="safe-bottom fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-1">Cookie preferences</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                We use Google Analytics to understand how visitors use LearnFast — pages visited, time on site, and general location. No personal data is shared with third parties.{" "}
                <a href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Privacy Policy
                </a>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={decline}
                className="px-4 py-2 text-xs font-semibold text-slate-400 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-xs font-semibold text-white bg-violet-500 rounded-lg hover:bg-violet-400 transition"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
