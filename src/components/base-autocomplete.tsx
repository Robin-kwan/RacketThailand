"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type Option = {
  value: string;
  label: string;
};

type AutocompleteVariant = "light" | "dark";

type BaseAutocompleteProps = {
  label: string;
  name: string;
  value: string;
  options: Option[];
  placeholder?: string;
  helperText?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  variant?: AutocompleteVariant;
};

const VARIANT_STYLES: Record<
  AutocompleteVariant,
  {
    label: string;
    helper: string;
    input: string;
    dropdown: string;
    optionActive: string;
    option: string;
    toggle: string;
  }
> = {
  dark: {
    label: "text-slate-100",
    helper: "text-slate-400",
    input:
      "w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-slate-500 focus:bg-slate-900",
    dropdown:
      "absolute z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1324] p-1 shadow-2xl shadow-black/50",
    optionActive: "bg-slate-800 text-white",
    option: "text-slate-300 hover:bg-slate-800/60",
    toggle: "text-slate-400",
  },
  light: {
    label: "text-slate-700",
    helper: "text-slate-500",
    input:
      "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-slate-400 focus:bg-white",
    dropdown:
      "absolute z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-200",
    optionActive: "bg-slate-100 text-slate-900",
    option: "text-slate-700 hover:bg-slate-100",
    toggle: "text-slate-500",
  },
};

export function BaseAutocomplete({
  label,
  name,
  value,
  options,
  placeholder,
  helperText,
  onChange,
  className = "",
  variant = "dark",
}: BaseAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const variantStyles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
  const selected = options.find((option) => option.value === value);
  const displayValue = selected?.label ?? "";

  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return options;
    }
    const normalized = query.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const emitChange = (nextValue: string) => {
    if (!onChange) return;
    const syntheticEvent = {
      target: { value: nextValue, name },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };

  const handleSelect = (nextValue: string) => {
    emitChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  const inputValue = open ? query : displayValue;

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      <label className={`text-sm font-semibold ${variantStyles.label}`}>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={`${name}-display`}
          value={inputValue}
          placeholder={placeholder ?? label}
          onFocus={() => {
            setOpen(true);
            setQuery(displayValue);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          className={variantStyles.input}
        />
        <input type="hidden" name={name} value={value} />
        <button
          type="button"
          className={`absolute inset-y-0 right-0 flex w-12 items-center justify-center ${variantStyles.toggle}`}
          onClick={() => {
            setOpen((prev) => !prev);
            setQuery(displayValue);
          }}
          aria-label="Toggle options"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition ${open ? "rotate-180" : ""}`}
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
        </button>
        {open && (
          <div className={variantStyles.dropdown}>
            {filteredOptions.length === 0 ? (
              <p
                className={`px-3 py-2 text-sm ${
                  variant === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                No matches found
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={`${name}-${option.value}`}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    option.value === value
                      ? variantStyles.optionActive
                      : variantStyles.option
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 7.5l2.5 2.5L11 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {helperText && (
        <p className={`text-xs ${variantStyles.helper}`}>{helperText}</p>
      )}
    </div>
  );
}
