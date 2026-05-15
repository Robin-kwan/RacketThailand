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
      className="group flex h-full w-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div className="min-w-0">
        <p className="line-clamp-2 text-2xl font-semibold text-slate-900">
          {title || fallbackTitle}
        </p>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
          <span className="truncate font-semibold text-slate-800">
            {locationLabel}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="truncate font-semibold text-slate-800">
            {dateLabel} ·{" "}
            {timeLabel || (locale === "th" ? "ยังไม่ระบุเวลา" : "Time not set")}
          </span>
        </div>
        {playerLabel && (
          <div className="flex min-w-0 items-center gap-2">
            <UsersRound className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
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
          className="line-clamp-3 text-sm text-slate-600"
          title={description}
        >
          {description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${playFormatBadgeClass}`}
        >
          {playFormatLabel}
        </span>
        {isFull && (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
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
