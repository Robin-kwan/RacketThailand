export const THAILAND_TIMEZONE = "Asia/Bangkok";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function pad(value: string | number) {
  return String(value).padStart(2, "0");
}

function getDateParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: THAILAND_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
  };
}

function getTimeParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: THAILAND_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(value);
  return {
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
  };
}

export function formatDateForDisplay(value: string | Date | null | undefined) {
  if (!value) return "";

  if (typeof value === "string") {
    const dateOnly = value.match(DATE_ONLY_PATTERN);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return `${day}/${month}/${year}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { day, month, year } = getDateParts(date);
  return `${day}/${month}/${year}`;
}

export function formatDateTimeForDisplay(
  value: string | Date | null | undefined,
) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { hour, minute } = getTimeParts(date);
  return `${formatDateForDisplay(date)} ${hour}:${minute}`;
}

export function formatDateInputForDisplay(value: string | null | undefined) {
  return formatDateForDisplay(value);
}

export function parseDisplayDateInput(value: string) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(DATE_ONLY_PATTERN);
  if (isoMatch) return trimmed;

  const displayMatch = trimmed.match(DISPLAY_DATE_PATTERN);
  if (!displayMatch) return null;

  const [, dayRaw, monthRaw, year] = displayMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const date = new Date(Date.UTC(Number(year), month - 1, day, 12));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}
