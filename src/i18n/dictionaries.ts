import en from "./en.json";
import th from "./th.json";

export const SUPPORTED_LOCALES = ["th", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type Dictionary = typeof th;

const dictionaries = {
  th,
  en,
} satisfies Record<Locale, Dictionary>;

export function normalizeLocale(locale?: string): Locale {
  if (locale === "en") {
    return "en";
  }
  return "th";
}

export function buildLocalizedPath(path: string, locale: Locale) {
  if (locale === "th") {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${locale}`;
}

export function getDictionary(locale: string): Dictionary {
  const normalized = normalizeLocale(locale);
  return dictionaries[normalized];
}
