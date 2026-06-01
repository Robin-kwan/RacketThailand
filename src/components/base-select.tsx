"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type SelectVariant = "light" | "dark";

type BaseSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  required?: boolean;
  helperText?: string;
  labelHidden?: boolean;
  className?: string;
  disabled?: boolean;
  variant?: SelectVariant;
};

const VARIANT_STYLES: Record<
  SelectVariant,
  { label: string; helper: string; select: string }
> = {
  dark: {
    label: "text-slate-100",
    helper: "text-slate-400",
    select:
      "w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3 pr-12 text-sm text-slate-100 outline-none transition focus:border-slate-500 focus:bg-slate-900",
  },
  light: {
    label: "text-slate-700",
    helper: "text-slate-500",
    select:
      "w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white",
  },
};

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
}: BaseSelectProps) {
  const selectId = useId();
  const variantStyles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
  const wrapperClasses = [
    "space-y-2",
    labelHidden ? "space-y-0" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const chevronColor =
    variant === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div className={wrapperClasses}>
      <label
        htmlFor={selectId}
        className={`text-sm font-semibold ${variantStyles.label} ${labelHidden ? "sr-only" : ""}`}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`${variantStyles.select} appearance-none ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {options.map((option) => (
            <option key={`${name}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          className={`pointer-events-none absolute inset-y-0 right-4 flex items-center ${chevronColor}`}
        >
          <ChevronDown
            className="h-4 w-4"
            strokeWidth={1.8}
            aria-hidden
          />
        </span>
      </div>
      {helperText && (
        <p className={`text-xs ${variantStyles.helper}`}>{helperText}</p>
      )}
    </div>
  );
}
