"use client";

import { Plus, Trash2 } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import {
  createClosingTimeOptions,
  createTimeOptions,
  filterTimeOptionsWithFallback,
  isClosingTimeAfterStart,
  isOpeningTimeBeforeClose,
} from "@/components/time-picker-field";
import {
  ensureAllDays,
  createAlwaysOpenSchedule,
  type OpeningHoursEntry,
  type OpeningHoursRange,
} from "@/lib/opening-hours";

type OpeningHoursEditorProps = {
  value: OpeningHoursEntry[] | null;
  onChange: (entries: OpeningHoursEntry[]) => void;
  copy?: OpeningHoursEditorCopy;
};

export type OpeningHoursEditorCopy = {
  dayLabels?: Partial<Record<string, string>>;
  addHours?: string;
  alwaysOpen?: string;
  closed?: string;
  openTime?: string;
  closeTime?: string;
  remove?: string;
};

const DEFAULT_DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DEFAULT_COPY: Required<OpeningHoursEditorCopy> = {
  dayLabels: DEFAULT_DAY_LABELS,
  addHours: "Add hours",
  alwaysOpen: "24 hrs",
  closed: "Closed",
  openTime: "Open time",
  closeTime: "Close time",
  remove: "Remove",
};

const DEFAULT_RANGE = { open: "09:00", close: "18:00" };

const TIME_OPTIONS = createTimeOptions({ minuteStep: 30 });
const CLOSE_TIME_OPTIONS = createClosingTimeOptions({ minuteStep: 30 });

const normalizeRangeOrder = (
  range: OpeningHoursRange,
  changedField: "open" | "close",
): OpeningHoursRange => {
  if (!range.close) return range;
  if (isClosingTimeAfterStart(range.close, range.open)) return range;
  if (changedField === "open") {
    return { ...range, close: range.open };
  }
  return { ...range, open: range.close };
};

export function OpeningHoursEditor({
  value,
  onChange,
  copy,
}: OpeningHoursEditorProps) {
  const labels = {
    ...DEFAULT_COPY,
    ...copy,
    dayLabels: {
      ...DEFAULT_DAY_LABELS,
      ...copy?.dayLabels,
    },
  };
  const entries =
    ensureAllDays(value && value.length > 0 ? value : createAlwaysOpenSchedule());

  const updateDay = (day: string, ranges: OpeningHoursEntry["ranges"]) => {
    const next = entries.map((entry) =>
      entry.day === day ? { ...entry, ranges } : entry,
    );
    onChange(next);
  };

  const addRange = (day: string) => {
    const entry = entries.find((item) => item.day === day);
    if (!entry) return;
    updateDay(day, [...entry.ranges, { ...DEFAULT_RANGE }]);
  };

  const updateRange = (
    day: string,
    index: number,
    field: "open" | "close",
    value: string,
  ) => {
    const entry = entries.find((item) => item.day === day);
    if (!entry) return;
    const next = entry.ranges.map((range, idx) => {
      if (idx !== index) return range;
      const updated = {
        ...range,
        [field]: value || null,
      } as OpeningHoursRange;
      return normalizeRangeOrder(updated, field);
    });
    updateDay(day, next);
  };

  const removeRange = (day: string, index: number) => {
    const entry = entries.find((item) => item.day === day);
    if (!entry) return;
    const next = entry.ranges.filter((_, idx) => idx !== index);
    updateDay(day, next);
  };

  const markClosed = (day: string) => {
    updateDay(day, []);
  };

  const set24Hours = (day: string) => {
    updateDay(day, [{ open: "00:00", close: "00:00" }]);
  };

  return (
    <div className="divide-y divide-slate-200">
      {entries.map((entry) => (
        <div
          key={entry.day}
          className="py-4 first:pt-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-900">
              {labels.dayLabels[entry.day] ?? entry.day}
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addRange(entry.day)}
                className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                <Plus className="h-3 w-3" /> {labels.addHours}
              </button>
              <button
                type="button"
                onClick={() => set24Hours(entry.day)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                {labels.alwaysOpen}
              </button>
              <button
                type="button"
                onClick={() => markClosed(entry.day)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                {labels.closed}
              </button>
            </div>
          </div>
          {entry.ranges.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{labels.closed}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {entry.ranges.map((range, index) => (
                <div
                  key={`${entry.day}-${index}`}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 sm:flex sm:items-center sm:gap-3"
                >
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:w-auto sm:grid-cols-[minmax(7rem,1fr)_auto_minmax(7rem,1fr)]">
                    <BaseSelect
                      label={labels.openTime}
                      labelHidden
                      name={`${entry.day}-open-${index}`}
                      value={range.open}
                      onChange={(event) =>
                        updateRange(entry.day, index, "open", event.target.value)
                      }
                      options={
                        range.close
                          ? range.close === "00:00"
                            ? TIME_OPTIONS
                            : filterTimeOptionsWithFallback(
                                TIME_OPTIONS,
                                (option) =>
                                  isOpeningTimeBeforeClose(
                                    option.value,
                                    range.close as string,
                                  ),
                              )
                          : TIME_OPTIONS
                      }
                      className="min-w-0 [&_select]:px-3 [&_select]:pr-9"
                      required
                      variant="light"
                    />
                    <span className="text-sm text-slate-500">–</span>
                    <BaseSelect
                      label={labels.closeTime}
                      labelHidden
                      name={`${entry.day}-close-${index}`}
                      value={range.close ?? ""}
                      onChange={(event) =>
                        updateRange(
                          entry.day,
                          index,
                          "close",
                          event.target.value,
                        )
                      }
                      options={
                        range.open
                          ? filterTimeOptionsWithFallback(
                              CLOSE_TIME_OPTIONS,
                              (option) =>
                                isClosingTimeAfterStart(
                                  option.value,
                                  range.open,
                                ),
                            )
                          : CLOSE_TIME_OPTIONS
                      }
                      className="min-w-0 [&_select]:px-3 [&_select]:pr-9"
                      required
                      variant="light"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRange(entry.day, index)}
                    className="justify-self-end flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 sm:ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                    {labels.remove}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
