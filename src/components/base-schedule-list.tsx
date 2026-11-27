import type { ReactNode } from "react";

export type BaseScheduleEntry = {
  id?: string | number;
  label: ReactNode;
  value: ReactNode;
  highlighted?: boolean;
};

type BaseScheduleListProps = {
  entries: BaseScheduleEntry[];
  className?: string;
  variant?: "default" | "responsive" | "sidebar";
};

export function BaseScheduleList({
  entries,
  className,
  variant = "default",
}: BaseScheduleListProps) {
  if (!entries.length) {
    return null;
  }

  if (variant === "responsive") {
    return (
      <div
        className={[
          "grid overflow-hidden border-y border-slate-200 sm:grid-cols-2 xl:grid-cols-12",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {entries.map((entry, index) => {
          const lastTwoColumnRow = index >= Math.floor((entries.length - 1) / 2) * 2;
          const desktopRowEnd = index === 3 || index === entries.length - 1;
          return (
            <div
              key={entry.id ?? index}
              className={[
                "flex min-w-0 items-center justify-between gap-4 border-slate-200 bg-white px-3 py-3 text-sm sm:px-4 xl:flex-col xl:items-start xl:justify-start xl:gap-1",
                index < entries.length - 1 ? "border-b" : "",
                index % 2 === 0 ? "sm:border-r" : "",
                lastTwoColumnRow ? "sm:border-b-0" : "sm:border-b",
                desktopRowEnd ? "xl:border-r-0" : "xl:border-r",
                index < 4 ? "xl:col-span-3" : "xl:col-span-4",
                index < 4 && entries.length > 4 ? "xl:border-b" : "xl:border-b-0",
                entry.highlighted ? "font-semibold text-emerald-700" : "text-slate-700",
              ].filter(Boolean).join(" ")}
            >
              <span className="min-w-0 font-semibold">{entry.label}</span>
              <span className="shrink-0 whitespace-nowrap text-right text-slate-600 xl:text-left">
                {entry.value}
              </span>
            </div>
          );
        })}
        {entries.length % 2 === 1 ? (
          <div aria-hidden className="hidden bg-white sm:block xl:hidden" />
        ) : null}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        className={[
          "divide-y divide-slate-200 border-b border-slate-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {entries.map((entry, index) => (
          <div
            key={entry.id ?? index}
            className={`grid min-w-0 grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.3fr)] items-start gap-3 bg-white px-1 py-3 text-sm ${
              entry.highlighted
                ? "font-semibold text-emerald-700"
                : "text-slate-700"
            }`}
          >
            <span className="min-w-0 font-semibold">{entry.label}</span>
            <span className="min-w-0 text-right leading-5 text-slate-600">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const containerClassName = [
    "overflow-hidden rounded-lg border border-[var(--rt-primary-border)] bg-[rgb(var(--rt-primary-soft-rgb)/0.7)] text-sm text-[var(--foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      {entries.map((entry, index) => {
        const baseClass =
          index % 2 === 0
            ? "bg-[#1e2633] text-white"
            : "bg-[#2b3444] text-white";
        const classNameRow = [
          "flex items-center justify-between gap-3 px-4 py-2",
          entry.highlighted
            ? "bg-emerald-900/40 text-[rgb(var(--rt-primary-text-rgb)/0.95)] font-semibold"
            : baseClass,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={entry.id ?? index} className={classNameRow}>
            <span>{entry.label}</span>
            <span className="text-right">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}
