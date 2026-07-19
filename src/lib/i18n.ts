import { createTranslator } from "next-intl";

export const SUPPORTED_LOCALES = ["th", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

export function normalizeLocale(value?: string | null): Locale {
  if (value && SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export function buildLocalizedPath(path: string, locale: Locale) {
  if (locale === DEFAULT_LOCALE) {
    return path;
  }
  const hashIndex = path.indexOf("#");
  const basePath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const joiner = basePath.includes("?") ? "&" : "?";
  return `${basePath}${joiner}lang=${locale}${hash}`;
}

async function loadMessages(locale: Locale) {
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return messages;
}

export async function getTranslator(locale: Locale) {
  const messages = await loadMessages(locale);
  return createTranslator({
    locale,
    messages,
  });
}
