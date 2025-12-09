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

type BaseAutocompleteProps = {
  label: string;
  name: string;
  value: string;
  options: Option[];
  placeholder?: string;
  helperText?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export function BaseAutocomplete({
  label,
  name,
  value,
  options,
  placeholder,
  helperText,
  onChange,
}: BaseAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
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
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400 focus:bg-white"
        />
        <input type="hidden" name={name} value={value} />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500"
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
          <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-200/80">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">
                No matches found
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={`${name}-${option.value}`}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    option.value === value
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50"
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
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
