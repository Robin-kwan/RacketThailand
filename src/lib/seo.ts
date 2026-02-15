import { buildLocalizedPath, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://racketthailand.com";

export function getSiteUrl() {
  return SITE_URL;
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function buildCanonicalUrl(path: string, locale: Locale) {
  const relative = buildLocalizedPath(path, locale);
  return buildAbsoluteUrl(relative);
}

export function buildLocaleAlternates(path: string) {
  return SUPPORTED_LOCALES.reduce<Record<Locale, string>>(
    (map, locale) => {
      map[locale] = buildCanonicalUrl(path, locale);
      return map;
    },
    {} as Record<Locale, string>,
  );
}

export function truncateMetaDescription(text: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const clipped = normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd();
  return `${clipped}...`;
}
