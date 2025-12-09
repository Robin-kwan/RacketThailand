"use client";

import { useId } from "react";

type Option = {
  value: string;
  label: string;
};

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
}: BaseSelectProps) {
  const selectId = useId();
  const wrapperClasses = [
    "space-y-2",
    labelHidden ? "space-y-0" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={wrapperClasses}>
      <label
        htmlFor={selectId}
        className={`text-sm font-semibold text-slate-700 ${labelHidden ? "sr-only" : ""}`}
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
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
        >
          {options.map((option) => (
            <option key={`${name}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {helperText && (
        <p className="text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
