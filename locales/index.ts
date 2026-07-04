import { en } from "./en";
import { fr } from "./fr";
import type { LocaleCatalogue, SupportedLocale } from "./types";

export const catalogues: Record<SupportedLocale, LocaleCatalogue> = { en, fr };

export function getCatalogue(locale: SupportedLocale): LocaleCatalogue {
  return catalogues[locale] ?? catalogues.en;
}

export type { LocaleCatalogue, SupportedLocale };
export { en, fr };
