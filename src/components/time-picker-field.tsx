"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { BaseTextField } from "@/components/base-text-field";

export type TimePickerOption = {
  value: string;
  label: string;
};

type CreateTimeOptionsInput = {
  minuteStep?: number;
  includeEndOfDay?: boolean;
};

export function createTimeOptions({
  minuteStep = 30,
  includeEndOfDay = false,
}: CreateTimeOptionsInput = {}): TimePickerOption[] {
  const options: TimePickerOption[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += minuteStep) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({
        value,
        label: value,
      });
    }
  }

  if (includeEndOfDay && !options.some((option) => option.value === "00:00")) {
    options.push({
      value: "00:00",
      label: "00:00",
    });
  }

  return options;
}

type TimePickerFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: TimePickerOption[];
  minuteStep?: number;
  min?: string;
  max?: string;
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
};

const formatDisplayTime = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  if (typeof hours === "undefined" || typeof minutes === "undefined") {
    return time;
  }
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

export function TimePickerField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  options,
  minuteStep = 30,
  min,
  max,
  allowClear = false,
  clearLabel = "Clear",
  className,
}: TimePickerFieldProps) {
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
  const resolvedOptions = useMemo(
    () =>
      options && options.length > 0
        ? options
        : createTimeOptions({ minuteStep }),
    [minuteStep, options],
  );

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
    if (open) {
      selectedOptionRef.current?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open]);

  const formattedValue = formatDisplayTime(value ?? "");
  const displayValue = formattedValue || placeholder || "";

  const handleSelect = (nextValue: string) => {
    if (disabled) return;
    if (allowClear && nextValue === value) {
      onChange("");
    } else {
      onChange(nextValue);
    }
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

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
          type="time"
          step={minuteStep * 60}
          min={min}
          max={max}
          value={value ?? ""}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          variant="light"
        />
        {open && (
          <div className="absolute left-0 top-full z-30 mt-3 w-[min(24rem,calc(100vw-3rem))] min-w-full rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-[rgb(var(--foreground-rgb)/0.55)]">
                {label}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {displayValue}
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto p-3">
              <div
                id={`${resolvedId}-listbox`}
                role="listbox"
                className="grid grid-cols-2 gap-2"
              >
                {resolvedOptions.map((option) => {
                  const selected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      ref={selected ? selectedOptionRef : null}
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-[rgb(var(--rt-primary-rgb)/0.35)] bg-[rgb(var(--rt-primary-rgb)/0.08)] text-[var(--foreground)]"
                          : "border-slate-200 bg-slate-50 text-[var(--foreground)] hover:border-slate-300 hover:bg-white"
                      }`}
                      onClick={() => handleSelect(option.value)}
                      role="option"
                      aria-selected={selected}
                    >
                      <span className="block font-semibold">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {allowClear && value ? (
              <div className="border-t border-slate-100 p-3">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {clearLabel}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
