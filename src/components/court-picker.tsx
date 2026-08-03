"use client";

import { BaseAutocomplete } from "@/components/base-autocomplete";

export type CourtPickerOption = {
  value: string;
  label: string;
};

type CourtPickerProps = {
  label: string;
  name: string;
  value: string;
  options: CourtPickerOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  noResultsText?: string;
  pinnedOptionValues?: string[];
  className?: string;
  variant?: "light" | "dark";
};

export function CourtPicker({
  label,
  name,
  value,
  options,
  onValueChange,
  placeholder,
  helperText,
  noResultsText,
  pinnedOptionValues,
  className,
  variant = "light",
}: CourtPickerProps) {
  return (
    <BaseAutocomplete
      label={label}
      name={name}
      value={value}
      options={options}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      helperText={helperText}
      noResultsText={noResultsText}
      pinnedOptionValues={pinnedOptionValues}
      className={className}
      variant={variant}
    />
  );
}
