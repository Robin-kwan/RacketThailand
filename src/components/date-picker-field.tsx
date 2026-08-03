"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BaseTextField } from "@/components/base-text-field";
import {
  formatDateInputForDisplay,
  parseDisplayDateInput,
} from "@/lib/date-format";
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
  inputClassName?: string;
  suffix?: ReactNode;
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
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
  );
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12),
  );
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
  const cells: Array<{
    key: string;
    dayNumber: number;
    disabled: boolean;
    isToday: boolean;
  } | null> = [];

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
  placeholder = "DD/MM/YYYY",
  className,
  inputClassName,
  suffix,
}: DatePickerFieldProps) {
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const localeTag = locale === "th" ? "th-TH" : "en-US";
  const minDate = useMemo(() => parseDateString(min ?? ""), [min]);
  const maxDate = useMemo(() => parseDateString(max ?? ""), [max]);
  const selectedDate = useMemo(() => parseDateString(value ?? ""), [value]);
  const initialViewDate = selectedDate ?? minDate ?? new Date();
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateInputForDisplay(value),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(initialViewDate),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDisplayValue(formatDateInputForDisplay(value));
  }, [value]);

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

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      if (window.innerWidth < 640) {
        setOpenAbove(false);
        return;
      }

      const inputBounds = containerRef.current?.getBoundingClientRect();
      if (!inputBounds) return;

      const estimatedCalendarHeight = 340;
      const spaceBelow = window.innerHeight - inputBounds.bottom;
      const spaceAbove = inputBounds.top;
      setOpenAbove(
        spaceBelow < estimatedCalendarHeight && spaceAbove > spaceBelow,
      );
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
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
    () => buildMonthCells(viewMonth, min, max, min),
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
  const desktopPlacementClass = openAbove
    ? "sm:bottom-full sm:top-auto sm:mb-2"
    : "sm:top-full sm:bottom-auto sm:mt-2";

  const openCalendar = () => {
    setViewMonth(startOfMonth(selectedDate ?? minDate ?? new Date()));
    setOpen(true);
  };

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
          value={displayValue}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onClick={() => {
            openCalendar();
          }}
          onFocus={() => {
            openCalendar();
          }}
          onBlur={() => {
            const parsedValue = parseDisplayDateInput(displayValue);
            const isWithinRange =
              parsedValue &&
              (!min || parsedValue >= min) &&
              (!max || parsedValue <= max);
            if (!isWithinRange) {
              onChange("");
              setDisplayValue("");
            }
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDisplayValue(nextValue);
            const parsedValue = parseDisplayDateInput(nextValue);
            if (!parsedValue) return;
            if ((min && parsedValue < min) || (max && parsedValue > max)) {
              onChange("");
              return;
            }
            onChange(parsedValue);
            const parsed = parseDateString(parsedValue);
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
          className={inputClassName}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {suffix}
          </span>
        ) : null}
        {open && (
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] sm:hidden"
              aria-label="Close calendar"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className={`fixed left-1/2 top-1/2 z-50 w-[min(19rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.45)] sm:absolute sm:left-0 sm:w-[19rem] sm:translate-x-0 sm:translate-y-0 ${desktopPlacementClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    canGoPrev &&
                    setViewMonth((current) => addMonths(current, -1))
                  }
                  disabled={!canGoPrev}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-slate-900">
                  {monthLabel}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    canGoNext &&
                    setViewMonth((current) => addMonths(current, 1))
                  }
                  disabled={!canGoNext}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 justify-items-center gap-1">
                {weekdayLabels.map((weekday) => (
                  <div
                    key={weekday}
                    className="flex size-9 items-center justify-center text-center text-[10px] font-semibold text-[rgb(var(--foreground-rgb)/0.45)]"
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
                        setDisplayValue(formatDateInputForDisplay(cell.key));
                        setOpen(false);
                      }}
                      className={`flex size-9 items-center justify-center rounded-lg border text-sm font-semibold transition ${
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
                    <div key={`empty-${index}`} className="size-9" />
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
