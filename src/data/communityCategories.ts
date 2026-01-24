export const COMMUNITY_CATEGORIES = [
  { key: "event", defaultLabel: "Events" },
  { key: "market", defaultLabel: "Marketplace" },
  { key: "question", defaultLabel: "Questions" },
  { key: "other", defaultLabel: "Other" },
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]["key"];
