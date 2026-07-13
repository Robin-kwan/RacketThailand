"use client";

import type { ChangeEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
  color?: string;
};

type SelectVariant = "light" | "dark";
type LabelPlacement = "above" | "inside";

type BaseSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  required?: boolean;
  helperText?: string;
  labelHidden?: boolean;
  className?: string;
  disabled?: boolean;
  variant?: SelectVariant;
  labelPlacement?: LabelPlacement;
  menuId?: string;
};

const VARIANT_STYLES: Record<
  SelectVariant,
  {
    label: string;
    helper: string;
    button: string;
    menu: string;
    option: string;
    activeOption: string;
  }
> = {
  dark: {
    label: "text-slate-100",
    helper: "text-slate-400",
    button:
      "border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-900 focus-visible:bg-slate-900 focus-visible:border-slate-500",
    menu: "border-slate-700 bg-slate-950 shadow-[0_18px_40px_rgb(15_23_42/0.32)]",
    option: "text-slate-200 hover:bg-slate-800",
    activeOption: "bg-emerald-900/45 font-semibold text-emerald-100",
  },
  light: {
    label: "text-slate-700",
    helper: "text-slate-500",
    button:
      "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:border-[var(--rt-primary)] focus-visible:ring-4 focus-visible:ring-[rgb(var(--rt-primary-rgb)/0.12)]",
    menu: "border-slate-200 bg-white shadow-[0_18px_40px_rgb(15_23_42/0.16)]",
    option: "text-slate-700 hover:bg-slate-50",
    activeOption: "bg-emerald-50 font-semibold text-emerald-900",
  },
};

function createSelectChangeEvent(
  name: string,
  value: string,
): ChangeEvent<HTMLSelectElement> {
  return {
    target: { name, value },
    currentTarget: { name, value },
  } as ChangeEvent<HTMLSelectElement>;
}

export function BaseSelect({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  helperText,
  labelHidden = false,
  className = "",
  disabled = false,
  variant = "dark",
  labelPlacement = "above",
  menuId,
}: BaseSelectProps) {
  const selectId = useId();
  const generatedMenuId = useId();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const variantStyles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
  const selectedOption =
    options.find((option) => option.value === value && !option.hidden) ??
    options.find((option) => !option.hidden);
  const resolvedMenuId = menuId ?? generatedMenuId;
  const wrapperClasses = [
    labelPlacement === "above" && !labelHidden ? "space-y-2" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeOnOutsidePress);
  }, []);

  const selectOption = (nextValue: string) => {
    if (disabled || nextValue === value) {
      setOpen(false);
      return;
    }

    onChange(createSelectChangeEvent(name, nextValue));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={wrapperClasses}>
      <label
        htmlFor={selectId}
        className={`text-sm font-semibold ${variantStyles.label} ${
          labelHidden || labelPlacement === "inside" ? "sr-only" : ""
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
          disabled={disabled}
        />
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={resolvedMenuId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm outline-none transition ${
            variantStyles.button
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {selectedOption?.color && (
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white shadow-sm"
              style={{ backgroundColor: selectedOption.color }}
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1">
            {labelPlacement === "inside" && (
              <span className="block text-[11px] font-medium text-slate-500">
                {label}
              </span>
            )}
            <span className="block truncate font-semibold">
              {selectedOption?.label ?? label}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        {open && (
          <div
            id={resolvedMenuId}
            role="listbox"
            aria-label={label}
            className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border p-1.5 ${variantStyles.menu}`}
          >
            {options
              .filter((option) => !option.hidden)
              .map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={`${name}-${option.value}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => selectOption(option.value)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? variantStyles.activeOption
                        : `font-medium ${variantStyles.option}`
                    }`}
                  >
                    {option.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <Check
                        className="h-4 w-4 shrink-0 text-emerald-700"
                        strokeWidth={2.3}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
      {helperText && (
        <p className={`text-xs ${variantStyles.helper}`}>{helperText}</p>
      )}
    </div>
  );
}
