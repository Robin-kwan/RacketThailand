export const END_OF_DAY_TIME = "00:00";

export function normalizeClockTime(value?: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function isOvernightTimeRange(
  startTime?: string | null,
  endTime?: string | null,
) {
  const start = normalizeClockTime(startTime);
  const end = normalizeClockTime(endTime);
  if (!start || !end || start === end || end === END_OF_DAY_TIME) {
    return false;
  }
  return end < start;
}

export function formatSimpleTimeRange(
  startTime: string,
  endTime: string,
) {
  const start = normalizeClockTime(startTime);
  const end = normalizeClockTime(endTime);
  return `${start} - ${end}`;
}
