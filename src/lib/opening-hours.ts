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

type GooglePeriod = {
  open?: { day?: number; time?: string };
  close?: { day?: number; time?: string };
};

type GoogleOpeningHoursPayload = {
  periods?: GooglePeriod[];
};

function isOpeningHoursEntryArray(
  entries: unknown,
): entries is OpeningHoursEntry[] {
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as OpeningHoursEntry).day === "string" &&
        Array.isArray((entry as OpeningHoursEntry).ranges),
    )
  );
}

function isGoogleOpeningHoursPayload(
  entries: unknown,
): entries is GoogleOpeningHoursPayload {
  return Boolean(
    entries &&
      typeof entries === "object" &&
      Array.isArray((entries as GoogleOpeningHoursPayload).periods),
  );
}

export function normalizeOpeningHoursEntries(
  entries?: unknown,
): OpeningHoursEntry[] {
  if (isOpeningHoursEntryArray(entries)) {
    return entries;
  }
  if (
    Array.isArray(entries) &&
    entries.every((entry) => typeof entry === "string")
  ) {
    return parseOpeningHoursText(entries.join("\n"));
  }
  if (isGoogleOpeningHoursPayload(entries)) {
    return googlePeriodsToStructured(entries.periods);
  }
  return [];
}

export function createEmptySchedule(): OpeningHoursEntry[] {
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: [],
  }));
}

export function createAlwaysOpenSchedule(): OpeningHoursEntry[] {
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: [{ open: "00:00", close: "00:00" }],
  }));
}

export function ensureAllDays(
  entries?: unknown,
): OpeningHoursEntry[] {
  const normalizedEntries = normalizeOpeningHoursEntries(entries);
  const map = new Map(
    normalizedEntries.map((entry) => [
      entry.day.toLowerCase(),
      (entry.ranges ?? []).map((range) => ({
        open: range.open,
        close: range.close ?? null,
      })),
    ]),
  );
  return WEEK_DAYS.map((day) => ({
    day,
    ranges: map.get(day) ?? [],
  }));
}

function normalizeDayLabel(day: string) {
  const normalizedDay = day.toLowerCase().trim();
  const thaiDayMap: Array<[string, string]> = [
    ["\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c", "monday"],
    ["\u0e2d\u0e31\u0e07\u0e04\u0e32\u0e23", "tuesday"],
    ["\u0e1e\u0e38\u0e18", "wednesday"],
    ["\u0e1e\u0e24\u0e2b\u0e31\u0e2a\u0e1a\u0e14\u0e35", "thursday"],
    ["\u0e1e\u0e24\u0e2b\u0e31\u0e2a", "thursday"],
    ["\u0e28\u0e38\u0e01\u0e23\u0e4c", "friday"],
    ["\u0e40\u0e2a\u0e32\u0e23\u0e4c", "saturday"],
    ["\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c", "sunday"],
  ];
  const thaiMatch = thaiDayMap.find(([label]) =>
    normalizedDay.includes(label),
  );
  if (thaiMatch) {
    return thaiMatch[1];
  }
  return (
    WEEK_DAYS.find((entry) => normalizedDay.startsWith(entry)) ?? day
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
    .forEach((line, index) => {
      const [dayPart, ...rest] = line.split(":");
      const normalizedDay = normalizeDayLabel(dayPart?.trim() ?? line);
      const day = WEEK_DAYS.includes(normalizedDay)
        ? normalizedDay
        : (WEEK_DAYS[(index + 1) % WEEK_DAYS.length] ?? normalizedDay);
      const rangesText = rest.join(":").trim();
      const ranges =
        rangesText.length > 0
          ? rangesText.split(",").map((segment) => segment.trim())
          : ["Open"];
      const parsedRanges = ranges.map<OpeningHoursRange>((segment) => {
        if (segment.toLowerCase() === "open" || segment === "—") {
          return { open: "Open", close: null };
        }
        const [start, end] = segment
          .split(/\s*(?:[-\u2013\u2014]|â€“|â€”)\s*/)
          .map((part) => part.trim());
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

function dayIndexToName(index?: number): string {
  if (typeof index !== "number" || index < 0 || index > 6) {
    return "sunday";
  }
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][index];
}

function formatGoogleTime(time?: string): string {
  if (!time || time.length < 4) return time ?? "";
  const normalizedTime = time === "2359" ? "0000" : time;
  return `${normalizedTime.slice(0, 2)}:${normalizedTime.slice(2)}`;
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
