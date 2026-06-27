export const INDUSTRIES = [
  { value: "sales",         en: "Sales & Business Development",   fr: "Ventes & Développement commercial" },
  { value: "leadership",    en: "Leadership & Management",         fr: "Direction & Management" },
  { value: "education",     en: "Education & Training",            fr: "Éducation & Formation" },
  { value: "healthcare",    en: "Healthcare & Medicine",           fr: "Santé & Médecine" },
  { value: "technology",    en: "Technology & Engineering",        fr: "Technologie & Ingénierie" },
  { value: "finance",       en: "Finance & Professional Services", fr: "Finance & Services professionnels" },
  { value: "marketing",     en: "Marketing & Communications",      fr: "Marketing & Communication" },
  { value: "consulting",    en: "Consulting",                      fr: "Conseil" },
  { value: "public_sector",  en: "Public Sector & Non-profit",      fr: "Secteur public & Associations" },
  { value: "academia",       en: "Academia & Research",             fr: "Enseignement supérieur & Recherche" },
  { value: "sports_coaching", en: "Sports Coaching",               fr: "Coaching sportif" },
  { value: "other",          en: "Other",                           fr: "Autre" },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

export function industryLabel(value: string, locale: "en" | "fr"): string {
  const ind = INDUSTRIES.find((i) => i.value === value);
  if (!ind) return value;
  return locale === "fr" ? ind.fr : ind.en;
}
