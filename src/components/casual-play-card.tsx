"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { Clock3, MapPin, UsersRound } from "lucide-react";
import {
  formatCasualPlayDate,
  formatCasualPlayTimeRange,
} from "@/lib/casual-play";
import type { Locale } from "@/lib/i18n";
import {
  getPlayFormatLabel,
  normalizePlayFormat,
  type PlayFormat,
} from "@/lib/play-format";

type CasualPlayCardProps = {
  title: string;
  href?: string | null;
  description?: string | null;
  venueName?: string | null;
  location?: string | null;
  playDate: string;
  startTime?: string | null;
  endTime?: string | null;
  playerAmount?: number | null;
  playFormat?: PlayFormat | null;
  acceptedCount?: number | null;
  locale: Locale;
  distanceLabel?: string | null;
};

export function CasualPlayCard({
  title,
  href,
  description,
  venueName,
  location,
  playDate,
  startTime,
  endTime,
  playerAmount,
  playFormat,
  acceptedCount,
  locale,
  distanceLabel = null,
}: CasualPlayCardProps) {
  const Wrapper: ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  const fallbackTitle =
    locale === "th" ? "หาเพื่อนตี" : "Casual play";
  const fallbackVenue = locale === "th" ? "ยังไม่ระบุสถานที่" : "Venue not set";
  const dateLabel = formatCasualPlayDate(playDate, locale, "compact");
  const timeLabel = formatCasualPlayTimeRange(startTime, endTime, locale);
  const normalizedPlayFormat = normalizePlayFormat(playFormat);
  const playFormatLabel = getPlayFormatLabel(playFormat, locale);
  const playFormatBadgeClass =
    normalizedPlayFormat === "single"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const maxPlayers =
    typeof playerAmount === "number" &&
    Number.isFinite(playerAmount) &&
    playerAmount > 0
      ? playerAmount
      : null;
  const joinedPlayers =
    maxPlayers !== null
      ? (typeof acceptedCount === "number" && Number.isFinite(acceptedCount)
          ? Math.max(0, acceptedCount)
          : 0) + 1
      : 0;
  const isFull = maxPlayers !== null && joinedPlayers >= maxPlayers;
  const locationLabel = [venueName ?? fallbackVenue, location]
    .filter(Boolean)
    .join(" · ");
  const playerLabel =
    maxPlayers !== null
      ? `${locale === "th" ? "ผู้เล่น" : "Players"}: ${joinedPlayers}/${maxPlayers}`
      : null;
  return (
    <Wrapper
      {...wrapperProps}
      className="group flex h-full w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-4 transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400 sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-6"
    >
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium text-slate-900 sm:text-xl">
          {title || fallbackTitle}
        </p>
      </div>
      <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs text-slate-600 sm:space-y-2 sm:pt-3 sm:text-sm">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600 sm:h-4 sm:w-4" aria-hidden />
          <span className="truncate font-semibold text-slate-800">
            {locationLabel}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" aria-hidden />
          <span className="truncate font-semibold text-slate-800">
            {dateLabel} ·{" "}
            {timeLabel || (locale === "th" ? "ยังไม่ระบุเวลา" : "Time not set")}
          </span>
        </div>
        {playerLabel && (
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <UsersRound className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" aria-hidden />
            <span className="truncate font-semibold text-slate-800">
              {playerLabel}
              {isFull && (
                <span className="ml-2 text-rose-700">
                  {locale === "th" ? "เต็ม" : "Full"}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
      {description && (
        <p
          className="line-clamp-2 text-xs text-slate-600 sm:line-clamp-3 sm:text-sm"
          title={description}
        >
          {description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-[11px] ${playFormatBadgeClass}`}
        >
          {playFormatLabel}
        </span>
        {isFull && (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 sm:px-3 sm:py-1 sm:text-[11px]">
            {locale === "th" ? "เต็ม" : "Full"}
          </span>
        )}
      </div>
      {distanceLabel && (
        <div className="text-xs font-semibold text-slate-500">{distanceLabel}</div>
      )}
    </Wrapper>
  );
}
