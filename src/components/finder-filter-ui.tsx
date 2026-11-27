"use client";

import { useEffect, type ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

export function FinderRequestError({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rt-card flex flex-wrap items-center justify-between gap-3 p-4">
      <p className="text-sm text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rt-btn-primary min-h-11 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {retryLabel}
      </button>
    </div>
  );
}

type FinderSearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function FinderSearchField({
  label,
  value,
  onChange,
  onSubmit,
}: FinderSearchFieldProps) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit();
        }}
        placeholder={label}
        className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)] md:h-14"
      />
    </label>
  );
}

type FinderFilterButtonProps = {
  label: string;
  open: boolean;
  activeCount: number;
  onClick: () => void;
};

export function FinderFilterButton({
  label,
  open,
  activeCount,
  onClick,
}: FinderFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition md:h-14 ${
        open || activeCount > 0
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>{label}</span>
      {activeCount > 0 ? (
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
      <ChevronDown
        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}

type FinderFilterPanelProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function FinderFilterPanel({
  open,
  title,
  closeLabel,
  onClose,
  children,
}: FinderFilterPanelProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        onClick={onClose}
        aria-label={closeLabel}
      />
      <section
        className="fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-[0_-24px_60px_-24px_rgb(15_23_42/0.45)] lg:static lg:mt-4 lg:max-h-none lg:overflow-visible lg:rounded-xl lg:bg-slate-50/70 lg:shadow-none"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 lg:static lg:bg-transparent lg:px-5 lg:py-3">
          <h2 className="text-base font-semibold text-slate-950 lg:text-sm">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 lg:hidden"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="p-5 pt-4">{children}</div>
      </section>
    </>
  );
}

type FinderFilterChipProps = {
  label: string;
  icon?: ReactNode;
  removeLabel: string;
  onRemove: () => void;
};

export function FinderFilterChip({
  label,
  icon,
  removeLabel,
  onRemove,
}: FinderFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-[rgb(var(--rt-primary-rgb)/0.2)] bg-[rgb(var(--rt-primary-rgb)/0.07)] py-1.5 pl-3 pr-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[rgb(var(--rt-primary-rgb)/0.4)] hover:bg-[rgb(var(--rt-primary-rgb)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rt-primary)] focus-visible:ring-offset-2 motion-reduce:transition-none"
      aria-label={`${removeLabel}: ${label}`}
      title={`${removeLabel}: ${label}`}
    >
      {icon ? <span className="shrink-0 text-[var(--rt-primary-soft)]" aria-hidden>{icon}</span> : null}
      <span className="min-w-0 break-words text-left leading-5 tabular-nums">{label}</span>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--rt-primary-rgb)/0.08)] text-[var(--rt-primary-soft)] transition-colors group-hover:bg-[rgb(var(--rt-primary-rgb)/0.16)] motion-reduce:transition-none">
        <X className="size-3.5" aria-hidden />
      </span>
    </button>
  );
}
