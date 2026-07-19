export const PLAYER_SKILL_LEVELS = [
  "beginner",
  "recreational",
  "intermediate",
  "advanced",
  "competitive",
] as const;

export type PlayerSkillLevel = (typeof PLAYER_SKILL_LEVELS)[number];

export const PLAYER_AVAILABILITY_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type PlayerAvailabilityDay =
  (typeof PLAYER_AVAILABILITY_DAYS)[number];

export const PLAYER_TIME_PREFERENCES = [
  "morning",
  "afternoon",
  "evening",
  "flexible",
] as const;

export type PlayerTimePreference =
  (typeof PLAYER_TIME_PREFERENCES)[number];

export const PLAYER_PLAY_FORMATS = ["single", "double", "either"] as const;
export type PlayerPlayFormat = (typeof PLAYER_PLAY_FORMATS)[number];

export const PLAYER_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

export type PlayerRequestStatus = (typeof PLAYER_REQUEST_STATUSES)[number];

export const ACTIVE_PLAYER_PROFILE_UNTIL = "9999-12-31T23:59:59.999Z";

export function buildActiveLookingUntil() {
  return ACTIVE_PLAYER_PROFILE_UNTIL;
}

export function isAllowedValue<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

export function normalizePlayerDays(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((day): day is PlayerAvailabilityDay =>
    isAllowedValue(PLAYER_AVAILABILITY_DAYS, day),
  );
}

export function normalizeOptionalPlayerText(
  value: unknown,
  maxLength: number,
) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}
