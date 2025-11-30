export type SportFeatureCard = {
  title: string;
  subtitle: string;
  details: string[];
};

export type SportFeatureGroup = {
  labelTh: string;
  labelEn: string;
  table: string;
  descriptionTh: string;
  descriptionEn: string;
  cards: SportFeatureCard[];
};

export type SportHero = {
  kicker: string;
  headlineTh: string;
  headlineEn: string;
  descriptionTh: string;
  descriptionEn: string;
  stats: { key: "courts" | "groups" | "matches"; value: string }[];
};

export type SportClosing = {
  titleTh: string;
  titleEn: string;
  detailTh: string;
  detailEn: string;
  actions: { labelTh: string; labelEn: string; href: string }[];
};

export type SportPagePayload = {
  code: string;
  name: string;
  accent: string;
  gradient: string;
  hero: SportHero;
  features: SportFeatureGroup[];
  closing: SportClosing;
};
