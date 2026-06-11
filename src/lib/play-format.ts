import type { Locale } from "@/lib/i18n";

export type PlayFormat = "single" | "double";

export const DEFAULT_PLAY_FORMAT: PlayFormat = "double";

export function isPlayFormat(value: unknown): value is PlayFormat {
  return value === "single" || value === "double";
}

export function normalizePlayFormat(value: unknown): PlayFormat {
  return isPlayFormat(value) ? value : DEFAULT_PLAY_FORMAT;
}

export function getPlayFormatLabel(value: unknown, locale: Locale | string) {
  const playFormat = normalizePlayFormat(value);
  if (locale === "th") {
    return playFormat === "single" ? "เดี่ยว" : "คู่";
  }
  return playFormat === "single" ? "Singles" : "Doubles";
}
