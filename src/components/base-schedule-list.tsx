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
  variant?: "default" | "responsive";
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
          "grid border-y border-slate-200 sm:grid-cols-2 xl:grid-cols-7",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {entries.map((entry, index) => (
          <div
            key={entry.id ?? index}
            className={`flex items-center justify-between gap-4 border-b border-slate-200 py-3 text-sm last:border-b-0 sm:px-4 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:flex-col xl:items-start xl:gap-1 xl:border-b-0 xl:border-r xl:py-3 xl:last:border-r-0 ${
              entry.highlighted
                ? "font-semibold text-emerald-700"
                : "text-slate-700"
            }`}
          >
            <span className="font-semibold">{entry.label}</span>
            <span className="text-right whitespace-nowrap text-slate-600">
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
