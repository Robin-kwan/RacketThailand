export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export type OpeningHoursRange = {
  open: string;
  close: string | null;
};

export type OpeningHoursEntry = {
  day: string;
  ranges: OpeningHoursRange[];
};

export function createEmptySchedule(): OpeningHoursEntry[] {
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: [],
  }));
}

export function createAlwaysOpenSchedule(): OpeningHoursEntry[] {
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: [{ open: "00:00", close: "23:59" }],
  }));
}

export function ensureAllDays(
  entries?: OpeningHoursEntry[] | null,
): OpeningHoursEntry[] {
  const map = new Map(
    entries?.map((entry) => [
      entry.day.toLowerCase(),
      (entry.ranges ?? []).map((range) => ({
        open: range.open,
        close: range.close ?? null,
      })),
    ]) ?? [],
  );
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: map.get(day) ?? [],
  }));
}

function normalizeDayLabel(day: string) {
  return (
    WEEK_DAYS.find((entry) => day.toLowerCase().startsWith(entry)) ?? day
  );
}

export function parseOpeningHoursText(
  text: string,
): OpeningHoursEntry[] {
  if (!text) return [];
  const grouped = new Map<string, OpeningHoursRange[]>();
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const [dayPart, ...rest] = line.split(":");
      const day = normalizeDayLabel(dayPart?.trim() ?? line);
      const rangesText = rest.join(":").trim();
      const ranges =
        rangesText.length > 0
          ? rangesText.split(",").map((segment) => segment.trim())
          : ["Open"];
      const parsedRanges = ranges.map<OpeningHoursRange>((segment) => {
        if (segment.toLowerCase() === "open" || segment === "—") {
          return { open: "Open", close: null };
        }
        const [start, end] = segment.split("–").map((part) => part.trim());
        return {
          open: start ?? segment,
          close: end ?? null,
        };
      });
      const existing = grouped.get(day) ?? [];
      grouped.set(day, [...existing, ...parsedRanges]);
    });

  return Array.from(grouped.entries())
    .map<OpeningHoursEntry>(([day, ranges]) => ({
      day,
      ranges,
    }))
    .sort(
      (a, b) =>
        (WEEK_DAYS.indexOf(a.day.toLowerCase()) ?? 7) -
        (WEEK_DAYS.indexOf(b.day.toLowerCase()) ?? 7),
    );
}

type GooglePeriod = {
  open?: { day?: number; time?: string };
  close?: { day?: number; time?: string };
};

function dayIndexToName(index?: number): string {
  if (typeof index !== "number" || index < 0 || index > 6) {
    return "sunday";
  }
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][index];
}

function formatGoogleTime(time?: string): string {
  if (!time || time.length < 4) return time ?? "";
  return `${time.slice(0, 2)}:${time.slice(2)}`;
}

export function googlePeriodsToStructured(
  periods?: GooglePeriod[],
): OpeningHoursEntry[] {
  if (!periods || periods.length === 0) return [];
  const grouped = new Map<string, OpeningHoursRange[]>();
  periods.forEach((period) => {
    const dayName = dayIndexToName(period.open?.day);
    const openTime = formatGoogleTime(period.open?.time);
    const closeTime = formatGoogleTime(period.close?.time);
    const range: OpeningHoursRange = {
      open: openTime,
      close: closeTime || null,
    };
    const existing = grouped.get(dayName) ?? [];
    grouped.set(dayName, [...existing, range]);
  });

  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => ({
    day,
    ranges: grouped.get(day) ?? [],
  })).filter((entry) => entry.ranges.length > 0);
}

function formatRange(range: OpeningHoursRange, locale: string) {
  if (range.open === "Open" && !range.close) {
    return locale === "th" ? "เปิดตลอดเวลา" : "Open 24 hours";
  }
  if (!range.close) {
    return `${range.open} – …`;
  }
  return `${range.open} – ${range.close}`;
}

export function formatStructuredHours(
  entries: OpeningHoursEntry[],
  locale: string = "en",
): string {
  if (entries.length === 0) return "";
  return entries
    .map((entry) => {
      const label =
        entry.day.charAt(0).toUpperCase() + entry.day.slice(1);
      const ranges =
        entry.ranges.length > 0
          ? entry.ranges
              .map((range) => formatRange(range, locale))
              .join(", ")
          : locale === "th"
            ? "ปิด"
            : "Closed";
      return `${label}: ${ranges}`;
    })
    .join("\n");
}
