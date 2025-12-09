import type { Locale } from "@/lib/i18n";

type LocalizedString = Record<Locale, string>;
type LocalizedList = Record<Locale, string[]>;

export type SportFeatureCard = {
  title: string;
  subtitle: string;
  details: string[];
};

export type SportFeatureGroup = {
  label: LocalizedString;
  table: string;
  description: LocalizedString;
  cards: SportFeatureCard[];
};

export type SportHero = {
  kicker: string;
  headline: LocalizedString;
  description: LocalizedString;
  stats: { key: "courts" | "groups" | "matches"; value: string }[];
};

export type SportClosing = {
  title: LocalizedString;
  detail: LocalizedString;
  actions: { label: LocalizedString; href: string }[];
};

export type SportPagePayload = {
  code: string;
  name: LocalizedString;
  accent: string;
  gradient: string;
  hero: SportHero;
  features: SportFeatureGroup[];
  closing: SportClosing;
};

export type LandingSport = {
  code: string;
  name: LocalizedString;
  color: string;
  coverImage: string;
  description: LocalizedString;
  highlights: LocalizedList;
};
