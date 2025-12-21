"use client";

import { Plus, Trash2 } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import {
  ensureAllDays,
  createEmptySchedule,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";

type OpeningHoursEditorProps = {
  value: OpeningHoursEntry[] | null;
  onChange: (entries: OpeningHoursEntry[]) => void;
};

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DEFAULT_RANGE = { open: "09:00", close: "18:00" };

const HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const TIME_OPTIONS = [...HALF_HOUR_OPTIONS, "23:59"].map((time) => ({
  value: time,
  label: time,
}));

const filterOptionsWithFallback = (
  predicate: (option: { value: string; label: string }) => boolean,
) => {
  const filtered = TIME_OPTIONS.filter(predicate);
  return filtered.length > 0 ? filtered : TIME_OPTIONS;
};

const normalizeRangeOrder = (
  range: OpeningHoursRange,
  changedField: "open" | "close",
): OpeningHoursRange => {
  if (!range.close) return range;
  if (range.open <= range.close) return range;
  if (changedField === "open") {
    return { ...range, close: range.open };
  }
  return { ...range, open: range.close };
};

export function OpeningHoursEditor({
  value,
  onChange,
}: OpeningHoursEditorProps) {
  const entries =
    ensureAllDays(value && value.length > 0 ? value : createEmptySchedule());

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
    updateDay(day, [{ open: "00:00", close: "23:59" }]);
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.day}
          className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-900">
              {DAY_LABELS[entry.day] ?? entry.day}
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addRange(entry.day)}
                className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                <Plus className="h-3 w-3" /> Add hours
              </button>
              <button
                type="button"
                onClick={() => set24Hours(entry.day)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                24 hrs
              </button>
              <button
                type="button"
                onClick={() => markClosed(entry.day)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                Closed
              </button>
            </div>
          </div>
          {entry.ranges.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Closed</p>
          ) : (
            <div className="mt-3 space-y-3">
              {entry.ranges.map((range, index) => (
                <div
                  key={`${entry.day}-${index}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <BaseSelect
                      label="Open time"
                      labelHidden
                      name={`${entry.day}-open-${index}`}
                      value={range.open}
                      onChange={(event) =>
                        updateRange(entry.day, index, "open", event.target.value)
                      }
                      options={
                        range.close
                          ? filterOptionsWithFallback(
                              (option) => option.value < (range.close as string),
                            )
                          : TIME_OPTIONS
                      }
                      className="w-32"
                      required
                    />
                    <span className="text-sm text-slate-500">–</span>
                    <BaseSelect
                      label="Close time"
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
                          ? filterOptionsWithFallback(
                              (option) => option.value > range.open,
                            )
                          : TIME_OPTIONS
                      }
                      className="w-32"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRange(entry.day, index)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
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
