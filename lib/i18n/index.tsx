"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getCatalogue } from "@/locales";
import type { SupportedLocale, LocaleCatalogue } from "@/locales/types";

// ---------------------------------------------------------------------------
// Locale resolution order (per spec §4.1.3):
//   1. Explicit user setting (Firestore presenters/{uid}.locale)
//   2. URL prefix (/fr/...)
//   3. Accept-Language header (detected server-side, passed via cookie)
//   4. Default "en"
// ---------------------------------------------------------------------------

function detectLocaleFromCookie(): SupportedLocale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)lf_locale=([^;]+)/);
  const v = match?.[1];
  return v === "fr" ? "fr" : "en";
}

function detectLocaleFromPath(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname.startsWith("/fr") ? "fr" : null;
}

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: LocaleCatalogue;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: async () => {},
  t: getCatalogue("en"),
});

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<SupportedLocale>(
    initialLocale ?? detectLocaleFromPath() ?? detectLocaleFromCookie()
  );

  // Sync locale from Firestore profile (highest priority for logged-in users)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "presenters", user.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const firestoreLocale = snap.data()?.locale as string | undefined;
        if (firestoreLocale === "fr" || firestoreLocale === "en") {
          setLocaleState(firestoreLocale);
          persistLocaleToCookie(firestoreLocale);
        }
      })
      .catch(() => {});
  }, [user]);

  const setLocale = useCallback(
    async (next: SupportedLocale) => {
      setLocaleState(next);
      persistLocaleToCookie(next);
      if (user) {
        try {
          await updateDoc(doc(db, "presenters", user.uid), { locale: next });
        } catch {
          // non-fatal
        }
      }
    },
    [user]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getCatalogue(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

function persistLocaleToCookie(locale: SupportedLocale) {
  if (typeof document === "undefined") return;
  document.cookie = `lf_locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useLocale(): SupportedLocale {
  return useContext(LocaleContext).locale;
}

export function useSetLocale(): (locale: SupportedLocale) => Promise<void> {
  return useContext(LocaleContext).setLocale;
}

/** Returns the full catalogue for the active locale. */
export function useT(): LocaleCatalogue {
  return useContext(LocaleContext).t;
}

/** Returns a namespace slice. Usage: const t = useTranslations("dashboard") */
export function useTranslations<K extends keyof LocaleCatalogue>(
  namespace: K
): LocaleCatalogue[K] {
  return useContext(LocaleContext).t[namespace];
}
