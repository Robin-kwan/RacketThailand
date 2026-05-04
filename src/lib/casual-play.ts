import type { Locale } from "@/lib/i18n";

export const THAILAND_TIMEZONE = "Asia/Bangkok";
const THAILAND_OFFSET = "+07:00";

type DateFormatStyle = "compact" | "full";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getThailandDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: THAILAND_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getThailandTodayDateString(now = new Date()) {
  const { year, month, day } = getThailandDateParts(now);
  return `${year}-${month}-${day}`;
}

export function addMonthsToDateString(value: string, months: number) {
  const [yearRaw, monthRaw, dayRaw] = value.split("-").map(Number);
  if (
    !Number.isFinite(yearRaw) ||
    !Number.isFinite(monthRaw) ||
    !Number.isFinite(dayRaw)
  ) {
    return value;
  }

  const totalMonths = monthRaw - 1 + months;
  const targetYear = yearRaw + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;
  const targetDay = Math.min(
    dayRaw,
    getDaysInMonth(targetYear, targetMonth),
  );

  return buildDateString(targetYear, targetMonth, targetDay);
}

export function getMaxCasualPlayDateString(now = new Date()) {
  return addMonthsToDateString(getThailandTodayDateString(now), 1);
}

export function isCasualPlayDateAllowed(playDate: string, now = new Date()) {
  const minDate = getThailandTodayDateString(now);
  const maxDate = getMaxCasualPlayDateString(now);
  return playDate >= minDate && playDate <= maxDate;
}

export function isCasualPlayExpired(playDate: string, now = new Date()) {
  return playDate < getThailandTodayDateString(now);
}

export function isCasualPlayTimeRangeValid(
  startTime: string,
  endTime?: string | null,
) {
  if (!startTime) return false;
  if (!endTime) return true;
  return startTime < endTime;
}

export function formatCasualPlayDate(
  playDate: string,
  locale: Locale,
  style: DateFormatStyle = "full",
) {
  if (!playDate) return "";
  const date = new Date(`${playDate}T12:00:00${THAILAND_OFFSET}`);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    timeZone: THAILAND_TIMEZONE,
    ...(style === "compact"
      ? { month: "short", day: "numeric" }
      : {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
  }).format(date);
}

export function formatCasualPlayTime(
  value: string | null | undefined,
  locale: Locale,
) {
  if (!value) return "";
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }
  const isoValue = `${pad(hours)}:${pad(minutes)}:00${THAILAND_OFFSET}`;
  const date = new Date(`1970-01-01T${isoValue}`);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    timeZone: THAILAND_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCasualPlayTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  locale: Locale,
) {
  const start = formatCasualPlayTime(startTime, locale);
  const end = formatCasualPlayTime(endTime, locale);
  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start) {
    return locale === "th" ? `เริ่ม ${start}` : `Starts ${start}`;
  }
  if (end) {
    return locale === "th" ? `ถึง ${end}` : `Until ${end}`;
  }
  return "";
}
