export const SCHEDULE_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export type WeeklyTimeRangeInput = {
  day: string;
  startTime?: string | null;
  endTime?: string | null;
};

export type NormalizedWeeklyTimeSegment = {
  day: ScheduleDay;
  startMinute: number;
  endMinute: number;
  sourceDay: ScheduleDay;
  overnight: boolean;
};

export function isScheduleDay(value?: string | null): value is ScheduleDay {
  return SCHEDULE_DAYS.includes(value as ScheduleDay);
}

export function getNextScheduleDay(day: ScheduleDay) {
  return SCHEDULE_DAYS[(SCHEDULE_DAYS.indexOf(day) + 1) % SCHEDULE_DAYS.length];
}

export function getPreviousScheduleDay(day: ScheduleDay) {
  return SCHEDULE_DAYS[
    (SCHEDULE_DAYS.indexOf(day) - 1 + SCHEDULE_DAYS.length) %
      SCHEDULE_DAYS.length
  ];
}

export function timeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export function normalizeWeeklyTimeRange(
  range: WeeklyTimeRangeInput,
): NormalizedWeeklyTimeSegment[] {
  const day = range.day.toLowerCase().trim();
  if (!isScheduleDay(day)) return [];

  const startMinute = timeToMinutes(range.startTime);
  const rawEndMinute = timeToMinutes(range.endTime);
  if (startMinute === null || rawEndMinute === null) return [];

  if (startMinute === 0 && rawEndMinute === 0) {
    return [
      {
        day,
        startMinute: 0,
        endMinute: 24 * 60,
        sourceDay: day,
        overnight: false,
      },
    ];
  }

  if (rawEndMinute === 0) {
    return [
      {
        day,
        startMinute,
        endMinute: 24 * 60,
        sourceDay: day,
        overnight: false,
      },
    ];
  }

  if (rawEndMinute > startMinute) {
    return [
      {
        day,
        startMinute,
        endMinute: rawEndMinute,
        sourceDay: day,
        overnight: false,
      },
    ];
  }

  return [
    {
      day,
      startMinute,
      endMinute: 24 * 60,
      sourceDay: day,
      overnight: true,
    },
    {
      day: getNextScheduleDay(day),
      startMinute: 0,
      endMinute: rawEndMinute,
      sourceDay: day,
      overnight: true,
    },
  ];
}

export function normalizeWeeklyTimeRanges(
  ranges: WeeklyTimeRangeInput[],
): NormalizedWeeklyTimeSegment[] {
  return ranges.flatMap((range) => normalizeWeeklyTimeRange(range));
}

export function weeklyRangeOverlapsDay(
  range: WeeklyTimeRangeInput,
  day: string,
) {
  const normalizedDay = day.toLowerCase().trim();
  if (!isScheduleDay(normalizedDay)) return false;
  return normalizeWeeklyTimeRange(range).some(
    (segment) => segment.day === normalizedDay,
  );
}

export function weeklyRangeOverlapsTimeWindow(
  range: WeeklyTimeRangeInput,
  day: string,
  startMinute: number,
  endMinute: number,
) {
  const normalizedDay = day.toLowerCase().trim();
  if (!isScheduleDay(normalizedDay)) return false;
  return normalizeWeeklyTimeRange(range).some(
    (segment) =>
      segment.day === normalizedDay &&
      segment.startMinute < endMinute &&
      startMinute < segment.endMinute,
  );
}
