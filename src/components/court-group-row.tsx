"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { GroupCardSession } from "@/components/group-card";
import {
  getPlayFormatLabel,
  isPlayFormat,
  normalizePlayFormat,
  type PlayFormat,
} from "@/lib/play-format";
import { formatSimpleTimeRange } from "@/lib/time-range";

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function compareSessions(left: GroupCardSession, right: GroupCardSession) {
  const leftDay = WEEKDAY_ORDER.indexOf(left.day.toLowerCase());
  const rightDay = WEEKDAY_ORDER.indexOf(right.day.toLowerCase());
  const dayComparison =
    (leftDay === -1 ? WEEKDAY_ORDER.length : leftDay) -
    (rightDay === -1 ? WEEKDAY_ORDER.length : rightDay);

  return (
    dayComparison ||
    (left.start_time ?? "").localeCompare(right.start_time ?? "")
  );
}

type CourtGroupRowProps = {
  href?: string | null;
  name: string;
  imageUrl: string;
  imageAlt: string;
  sessions: GroupCardSession[];
  dayLabels: Record<string, string>;
  scheduleAnytime: string;
  locale: Locale;
  description?: string | null;
  playFormat?: PlayFormat | null;
  allowWalkIn?: boolean | null;
  walkInsWelcome: string;
  walkInsClosed: string;
  verifiedLabel?: string | null;
  verifiedTooltip?: string | null;
};

export function CourtGroupRow({
  href,
  name,
  imageUrl,
  imageAlt,
  sessions,
  dayLabels,
  scheduleAnytime,
  locale,
  description,
  playFormat,
  allowWalkIn,
  walkInsWelcome,
  walkInsClosed,
  verifiedLabel,
  verifiedTooltip,
}: CourtGroupRowProps) {
  const orderedSessions = [...sessions].sort(compareSessions);
  const visibleSessions = orderedSessions.slice(0, 3);
  const remaining = Math.max(0, sessions.length - visibleSessions.length);
  const normalizedPlayFormat = isPlayFormat(playFormat)
    ? normalizePlayFormat(playFormat)
    : null;
  const playFormatLabel = normalizedPlayFormat
    ? getPlayFormatLabel(normalizedPlayFormat, locale)
    : null;
  const content = (
    <>
      <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-32">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 96px, 128px"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-slate-950">{name}</h3>
          {verifiedLabel ? (
            <span
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              title={verifiedTooltip ?? undefined}
            >
              {verifiedLabel}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
        {playFormatLabel || typeof allowWalkIn === "boolean" ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {playFormatLabel ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  normalizedPlayFormat === "single"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {playFormatLabel}
              </span>
            ) : null}
            {typeof allowWalkIn === "boolean" ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  allowWalkIn
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {allowWalkIn ? walkInsWelcome : walkInsClosed}
              </span>
            ) : null}
          </div>
        ) : null}
        {visibleSessions.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {visibleSessions.map((session, index) => (
              <li key={`${session.day}-${session.start_time}-${index}`}>
                <span className="font-semibold text-slate-700">
                  {dayLabels[session.day] ?? session.day}
                </span>
                <span aria-hidden> · </span>
                {session.start_time && session.end_time
                  ? formatSimpleTimeRange(session.start_time, session.end_time)
                  : scheduleAnytime}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{scheduleAnytime}</p>
        )}
        {remaining > 0 ? (
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {locale === "th" ? `+${remaining} รอบ` : `+${remaining} sessions`}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700"
        aria-hidden
      />
    </>
  );

  return href ? (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 py-4"
    >
      {content}
    </Link>
  ) : (
    <div className="group flex items-center gap-4 py-4">{content}</div>
  );
}
