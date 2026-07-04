type GtagSource = "setting" | "url" | "header" | "org_default";

function fireGtag(event: string, params: Record<string, string>) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") w.gtag("event", event, params);
}

export function trackLocaleSet(locale: string, source: GtagSource) {
  fireGtag("locale_set", { locale, source });
}
