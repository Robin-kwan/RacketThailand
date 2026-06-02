"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode, ElementType } from "react";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import {
  getPlayFormatLabel,
  normalizePlayFormat,
  type PlayFormat,
} from "@/lib/play-format";

type SessionCourt = { id?: string | null; name?: string | null } | null;

export type GroupCardSession = {
  day: string;
  start_time: string | null;
  end_time: string | null;
  courts?: SessionCourt;
};

type GroupCardProps = {
  name: string;
  href?: string | null;
  imageUrl: string;
  imageAlt?: string;
  description?: string | null;
  location?: string | null;
  sessions?: GroupCardSession[] | null;
  playFormat?: PlayFormat | null;
  allowWalkIn?: boolean | null;
  verifiedLabel?: string | null;
  verifiedTooltip?: string | null;
  dayLabels: Record<string, string>;
  scheduleAnytime: string;
  locale: Locale;
  courtSportCode?: string | null;
  sessionLimit?: number;
  showSessions?: boolean;
  showDescription?: boolean;
  showLocation?: boolean;
  distanceLabel?: string | null;
  className?: string;
  titleClassName?: string;
  imageAspectClass?: string;
  badge?: ReactNode;
};

function formatTime(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function SessionList({
  sessions,
  dayLabels,
  scheduleAnytime,
  sessionLimit = 3,
  locale,
  courtSportCode,
  onCourtClick,
}: {
  sessions?: GroupCardSession[] | null;
  dayLabels: Record<string, string>;
  scheduleAnytime: string;
  sessionLimit?: number;
  locale: Locale;
  courtSportCode?: string | null;
  onCourtClick?: (href: string) => void;
}) {
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-xs text-slate-500 sm:text-sm">
        {scheduleAnytime}
      </p>
    );
  }
  const visible = sessions.slice(0, sessionLimit);
  const remaining = Math.max(0, sessions.length - visible.length);
  const courtConnector = locale === "th" ? " ที่ " : " @ ";

  return (
    <div className="space-y-1 text-xs leading-snug text-slate-600 sm:text-sm">
      <ul className="space-y-1">
        {visible.map((session, index) => {
          const dayLabel = dayLabels[session.day] ?? session.day;
          const start = formatTime(session.start_time);
          const end = formatTime(session.end_time);
          const timeRange =
            start && end ? `${start} – ${end}` : scheduleAnytime;
          const courtName = session.courts?.name ?? null;
          const courtId = session.courts?.id ?? null;
          const courtHref =
            courtId && locale
              ? buildLocalizedPath(
                  `/courts/${courtId}${
                    courtSportCode
                      ? `?sport=${encodeURIComponent(courtSportCode)}`
                      : ""
                  }`,
                  locale,
                )
              : null;
          return (
            <li key={`${session.day}-${session.start_time}-${index}`}>
              <span className="font-semibold">{dayLabel}</span> · {timeRange}
              {courtName &&
                (courtHref ? (
                  <span>
                    {courtConnector}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCourtClick?.(courtHref);
                      }}
                      className="text-blue-600 underline-offset-2 hover:underline"
                    >
                      {courtName}
                    </button>
                  </span>
                ) : (
                  <span>
                    {courtConnector}
                    <span className="text-blue-600">{courtName}</span>
                  </span>
                )
                )}
            </li>
          );
        })}
      </ul>
      {remaining > 0 && (
        <p className="text-xs text-slate-500">
          {locale === "th" ? `… อีก ${remaining} รายการ` : `… ${remaining} more`}
        </p>
      )}
    </div>
  );
}

export function GroupCard({
  name,
  href,
  imageUrl,
  imageAlt,
  description,
  location,
  sessions,
  playFormat,
  allowWalkIn,
  verifiedLabel = null,
  verifiedTooltip = null,
  dayLabels,
  scheduleAnytime,
  locale,
  courtSportCode,
  sessionLimit = 3,
  showSessions = false,
  showDescription = true,
  showLocation = false,
  distanceLabel = null,
  className,
  titleClassName,
  imageAspectClass = "aspect-[4/3]",
  badge,
}: GroupCardProps) {
  const router = useRouter();

  const handleCourtNavigate = (href?: string | null) => {
    if (!href) return;
    router.push(href);
  };

  const Wrapper: ElementType = href ? Link : "div";
  const wrapperProps = href
    ? { href }
    : {};
  const fallbackGroupName =
    locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackGroupPhotoAlt =
    locale === "th" ? "รูปกลุ่ม" : "Group photo";
  const normalizedPlayFormat = normalizePlayFormat(playFormat);
  const playFormatLabel = getPlayFormatLabel(playFormat, locale);
  const playFormatBadgeClass =
    normalizedPlayFormat === "single"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const playFormatBadge = (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-[11px] ${playFormatBadgeClass}`}
    >
      {playFormatLabel}
    </span>
  );
  const walkInBadge =
    allowWalkIn === true ? (
      <span className="inline-flex shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 sm:px-3 sm:py-1 sm:text-[11px]">
        {locale === "th" ? "รับวอล์กอิน" : "Walk-ins welcome"}
      </span>
    ) : null;
  const verifiedText = verifiedTooltip ?? verifiedLabel;
  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400 sm:rounded-3xl ${className ?? ""}`}
    >
      <div className="overflow-hidden border-b border-slate-100 bg-slate-100">
        <div className={`relative ${imageAspectClass} w-full`}>
          <Image
            src={imageUrl}
            alt={imageAlt ?? name ?? fallbackGroupPhotoAlt}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <div className="text-left">
          <p
            className={`line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base ${titleClassName ?? ""}`}
          >
            {name || fallbackGroupName}
            {verifiedText && (
              <span
                className="group/verified relative ml-1.5 inline-flex align-[-2px]"
                aria-label={verifiedText}
                title={verifiedText}
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4"
                  strokeWidth={2}
                  aria-hidden
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-44 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg group-hover/verified:block sm:w-52"
                >
                  {verifiedText}
                </span>
              </span>
            )}
          </p>
        </div>
        {showDescription && description && (
          <p
            className="line-clamp-2 break-all text-xs leading-snug text-slate-600"
            title={description}
          >
            {description}
          </p>
        )}
        {showLocation && location && (
          <p className="line-clamp-1 text-[11px] font-semibold text-slate-500 sm:text-xs" title={location}>
            {location}
          </p>
        )}
        {showSessions && (
          <SessionList
            sessions={sessions}
            dayLabels={dayLabels}
            scheduleAnytime={scheduleAnytime}
            sessionLimit={sessionLimit}
            locale={locale}
            courtSportCode={courtSportCode}
            onCourtClick={handleCourtNavigate}
          />
        )}
        {distanceLabel && (
          <div className="text-xs font-semibold text-slate-500">{distanceLabel}</div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {playFormatBadge}
          {walkInBadge}
          {badge}
        </div>
      </div>
    </Wrapper>
  );
}
