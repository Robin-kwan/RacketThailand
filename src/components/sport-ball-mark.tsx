"use client";

import type { CSSProperties } from "react";

type SportBallMarkProps = {
  sportCode?: string;
  label?: string;
  accent?: string;
  compact?: boolean;
  variant?: "header" | "drawer";
};

function SportBallGlyph({ sportCode }: { sportCode?: string }) {
  const ballRadius = sportCode === "padel" ? 10.3 : 12.2;
  const ballOverlayOpacity = sportCode === "padel" ? 0.18 : 0.18;
  const seamStrokeWidth = sportCode === "padel" ? 2 : 2.25;
  switch (sportCode) {
    case "badminton":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <path
            d="M6.8 5.5h18.4l-5.5 17.1h-7.4L6.8 5.5Z"
            fill="white"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M10.5 5.8 13.3 22.2M16 5.8v16.4M21.5 5.8 18.7 22.2M9.5 14.8h13M11.1 19h9.8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.45"
          />
          <path
            d="M12.5 22h7l1.6 3.1c-1.1 1.6-2.8 2.5-5.1 2.5s-4-.9-5.1-2.5L12.5 22Z"
            fill="currentColor"
          />
        </svg>
      );
    case "pickleball":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <circle cx="16" cy="16" r="11.5" fill="#f4ff7a" />
          <circle cx="16" cy="16" r="11.5" fill="currentColor" opacity="0.12" />
          {[9.8, 16, 22.2].map((x) =>
            [10.5, 16, 21.5].map((y) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="1.55"
                fill="#155e4f"
                opacity="0.72"
              />
            )),
          )}
        </svg>
      );
    case "tabletennis":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <circle cx="16" cy="16" r="11.5" fill="#fb923c" />
          <circle cx="12.2" cy="11.4" r="3.1" fill="white" opacity="0.42" />
          <path
            d="M7.6 14.2c2.8-4.4 7.4-6.1 12.9-4.7"
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth="1.8"
            opacity="0.5"
          />
        </svg>
      );
    case "padel":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <circle cx="16" cy="16" r={ballRadius} fill="#ccff00" />
          <circle cx="16" cy="16" r={ballRadius} fill="currentColor" opacity={ballOverlayOpacity} />
          <path
            d="M7.8 9.5c4.5 2.8 6.9 7.4 7.1 13.2M24.2 22.5c-4.5-2.8-6.9-7.4-7.1-13.2"
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth={seamStrokeWidth}
            opacity="0.95"
          />
        </svg>
      );
    case "tennis":
    default:
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <circle cx="16" cy="16" r={ballRadius} fill="#ccff00" />
          <circle cx="16" cy="16" r={ballRadius} fill="currentColor" opacity={ballOverlayOpacity} />
          <path
            d="M7.8 9.5c4.5 2.8 6.9 7.4 7.1 13.2M24.2 22.5c-4.5-2.8-6.9-7.4-7.1-13.2"
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth={seamStrokeWidth}
            opacity="0.95"
          />
        </svg>
      );
  }
}

export function SportBallMark({
  sportCode,
  label,
  accent = "#0f766e",
  compact = false,
  variant = "header",
}: SportBallMarkProps) {
  if (!sportCode || !label) return null;

  const style = { "--sport-accent": accent } as CSSProperties;
  const shellClass =
    variant === "drawer"
      ? "border-slate-200 bg-slate-50 text-slate-900"
      : "border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]";
  const labelClass =
    variant === "drawer" ? "text-slate-700" : "text-white/95";
  const containerClass = compact
    ? `inline-flex h-11 w-11 items-center justify-center rounded-full border p-1.5 ${shellClass}`
    : `inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 ${shellClass}`;

  return (
    <span
      className={containerClass}
      style={style}
      aria-label={label}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--sport-accent)] shadow-sm"
        aria-hidden
      >
        <span className="h-6 w-6">
          <SportBallGlyph sportCode={sportCode} />
        </span>
      </span>
      {!compact && (
        <span className={`pr-1 text-xs font-semibold ${labelClass}`}>
          {label}
        </span>
      )}
    </span>
  );
}
