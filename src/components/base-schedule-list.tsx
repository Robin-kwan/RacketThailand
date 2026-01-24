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
};

export function BaseScheduleList({
  entries,
  className,
}: BaseScheduleListProps) {
  if (!entries.length) {
    return null;
  }

  const containerClassName = [
    "overflow-hidden rounded-2xl border border-[var(--rt-primary-border)] bg-[rgb(var(--rt-primary-soft-rgb)/0.7)] text-sm text-[var(--foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      {entries.map((entry, index) => {
        const baseClass =
          index % 2 === 0 ? "bg-[#1e2633] text-white" : "bg-[#2b3444] text-white";
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
