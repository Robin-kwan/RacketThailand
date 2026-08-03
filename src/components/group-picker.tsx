"use client";

import { BaseAutocomplete } from "@/components/base-autocomplete";

export type GroupPickerOption = {
  value: string;
  label: string;
};

type GroupPickerProps = {
  label: string;
  name: string;
  value: string;
  options: GroupPickerOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  noResultsText?: string;
  pinnedOptionValues?: string[];
  className?: string;
  variant?: "light" | "dark";
};

export function GroupPicker({
  label,
  name,
  value,
  options,
  onValueChange,
  placeholder,
  noResultsText,
  pinnedOptionValues,
  className,
  variant = "light",
}: GroupPickerProps) {
  return (
    <BaseAutocomplete
      label={label}
      name={name}
      value={value}
      options={options}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      noResultsText={noResultsText}
      pinnedOptionValues={pinnedOptionValues}
      className={className}
      variant={variant}
    />
  );
}
