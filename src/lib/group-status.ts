export const GROUP_STATUSES = ["draft", "published"] as const;

export type GroupStatus = (typeof GROUP_STATUSES)[number];

export function normalizeGroupStatus(value?: string | null): GroupStatus {
  return value === "draft" ? "draft" : "published";
}

export function isPublishedGroupStatus(value?: string | null) {
  return normalizeGroupStatus(value) === "published";
}
