"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  dayLabels: Record<string, string>;
  scheduleAnytime: string;
  locale: Locale;
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
  onCourtClick,
}: {
  sessions?: GroupCardSession[] | null;
  dayLabels: Record<string, string>;
  scheduleAnytime: string;
  sessionLimit?: number;
  locale: Locale;
  onCourtClick?: (href: string) => void;
}) {
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {scheduleAnytime}
      </p>
    );
  }
  const visible = sessions.slice(0, sessionLimit);
  const remaining = Math.max(0, sessions.length - visible.length);
  const courtConnector = locale === "th" ? " ที่ " : " @ ";

  return (
    <div className="space-y-1 text-sm text-slate-600">
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
              ? buildLocalizedPath(`/courts/${courtId}`, locale)
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
  dayLabels,
  scheduleAnytime,
  locale,
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
      className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${playFormatBadgeClass}`}
    >
      {playFormatLabel}
    </span>
  );

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex h-full w-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400 ${className ?? ""}`}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
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
      <div className="flex items-start justify-between gap-3 text-left">
        <p
          className={`text-2xl font-semibold text-slate-900 ${titleClassName ?? ""}`}
        >
          {name || fallbackGroupName}
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {playFormatBadge}
          {badge}
        </div>
      </div>
      {showDescription && description && (
        <p
          className="text-sm text-slate-600 line-clamp-2 break-all"
          title={description}
        >
          {description}
        </p>
      )}
      {showLocation && location && (
        <p className="text-xs font-semibold text-slate-500 line-clamp-1" title={location}>
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
          onCourtClick={handleCourtNavigate}
        />
      )}
      {distanceLabel && (
        <div className="text-xs font-semibold text-slate-500">{distanceLabel}</div>
      )}
    </Wrapper>
  );
}
