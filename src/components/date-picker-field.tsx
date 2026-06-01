"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BaseTextField } from "@/components/base-text-field";
import type { Locale } from "@/lib/i18n";

type DatePickerFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateString(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-").map(Number);
  const date = new Date(Date.UTC(yearRaw, monthRaw - 1, dayRaw, 12));
  if (
    date.getUTCFullYear() !== yearRaw ||
    date.getUTCMonth() !== monthRaw - 1 ||
    date.getUTCDate() !== dayRaw
  ) {
    return null;
  }
  return date;
}

function formatDateString(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12));
}

function buildMonthCells(
  month: Date,
  minDate: string | undefined,
  maxDate: string | undefined,
  todayDate: string | undefined,
) {
  const firstDay = startOfMonth(month);
  const leadingEmptyCells = firstDay.getUTCDay();
  const totalDays = endOfMonth(month).getUTCDate();
  const cells: Array<
    | {
        key: string;
        dayNumber: number;
        disabled: boolean;
        isToday: boolean;
      }
    | null
  > = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const key = formatDateString(
      new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 12)),
    );
    cells.push({
      key,
      dayNumber: day,
      disabled:
        (Boolean(minDate) && key < (minDate as string)) ||
        (Boolean(maxDate) && key > (maxDate as string)),
      isToday: key === todayDate,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  locale,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = "YYYY-MM-DD",
  className,
}: DatePickerFieldProps) {
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const localeTag = locale === "th" ? "th-TH" : "en-US";
  const minDate = useMemo(() => parseDateString(min ?? ""), [min]);
  const maxDate = useMemo(() => parseDateString(max ?? ""), [max]);
  const selectedDate = useMemo(() => parseDateString(value ?? ""), [value]);
  const initialViewDate = selectedDate ?? minDate ?? new Date();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initialViewDate));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(localeTag, {
          weekday: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, 7 + index, 12))),
      ),
    [localeTag],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(viewMonth),
    [localeTag, viewMonth],
  );

  const monthCells = useMemo(
    () =>
      buildMonthCells(
        viewMonth,
        min,
        max,
        min,
      ),
    [max, min, viewMonth],
  );

  const canGoPrev = useMemo(() => {
    if (!minDate) return true;
    return endOfMonth(addMonths(viewMonth, -1)) >= startOfMonth(minDate);
  }, [minDate, viewMonth]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return true;
    return startOfMonth(addMonths(viewMonth, 1)) <= startOfMonth(maxDate);
  }, [maxDate, viewMonth]);

  const rootClassName = className ? `space-y-2 ${className}` : "space-y-2";

  return (
    <div className={rootClassName} ref={containerRef}>
      <label
        className="text-sm font-semibold text-[var(--foreground)]"
        htmlFor={resolvedId}
      >
        {label}
      </label>
      <div className="relative">
        <BaseTextField
          id={resolvedId}
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={value ?? ""}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onClick={() => {
            setViewMonth(startOfMonth(selectedDate ?? minDate ?? new Date()));
            setOpen(true);
          }}
          onFocus={() => {
            setViewMonth(startOfMonth(selectedDate ?? minDate ?? new Date()));
            setOpen(true);
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            const parsed = parseDateString(nextValue);
            if (parsed) {
              setViewMonth(startOfMonth(parsed));
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          variant="light"
        />
        {open && (
          <div className="fixed inset-x-3 bottom-4 z-50 max-h-[min(400px,calc(100dvh-2rem))] min-w-0 overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.45)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-3 sm:w-[min(26rem,calc(100vw-3rem))] sm:min-w-full">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => canGoPrev && setViewMonth((current) => addMonths(current, -1))}
                disabled={!canGoPrev}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.45)]">
                  {label}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {monthLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => canGoNext && setViewMonth((current) => addMonths(current, 1))}
                disabled={!canGoNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {weekdayLabels.map((weekday) => (
                <div
                  key={weekday}
                  className="text-center text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.45)]"
                >
                  {weekday}
                </div>
              ))}
              {monthCells.map((cell, index) =>
                cell ? (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={cell.disabled}
                    onClick={() => {
                      onChange(cell.key);
                      setOpen(false);
                    }}
                    className={`aspect-square rounded-2xl border text-sm font-semibold transition ${
                      cell.key === value
                        ? "border-[rgb(var(--rt-primary-rgb)/0.35)] bg-[rgb(var(--rt-primary-rgb)/0.1)] text-[var(--foreground)]"
                        : cell.disabled
                          ? "border-slate-100 bg-slate-50 text-slate-300"
                          : cell.isToday
                            ? "border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {cell.dayNumber}
                  </button>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square"
                  />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
