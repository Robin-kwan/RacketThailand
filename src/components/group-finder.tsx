"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { GroupRecord } from "@/server/groupFinder";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";

type GroupFinderCopy = {
  searchPlaceholder: string;
  visibilityLabel: string;
  filterAll: string;
  filterPublic: string;
  filterPrivate: string;
  reset: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  sessionsLabel: string;
  scheduleAnytime: string;
  privacyPublic: string;
  privacyPrivate: string;
  lastUpdated: string;
};

type GroupFinderProps = {
  sportCode: string;
  locale: Locale;
  accent: string;
  fallbackImage: string;
  copy: GroupFinderCopy;
  dayLabels: Record<string, string>;
  initialGroups: GroupRecord[];
  total: number;
};

const PAGE_SIZE = 12;

function formatTime(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function GroupFinder({
  sportCode,
  locale,
  accent,
  fallbackImage,
  copy,
  dayLabels,
  initialGroups,
  total,
}: GroupFinderProps) {
  const [search, setSearch] = useState("");
  type VisibilityFilter = "" | "public" | "private";
  const [visibility, setVisibility] = useState<VisibilityFilter>("");
  const [groups, setGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(total);
  const localeQuery =
    locale === DEFAULT_LOCALE ? "" : `?lang=${locale}`;

  const visibilityOptions = useMemo(
    () =>
      [
        { value: "" as VisibilityFilter, label: copy.filterAll },
        { value: "public" as VisibilityFilter, label: copy.filterPublic },
        { value: "private" as VisibilityFilter, label: copy.filterPrivate },
      ],
    [copy.filterAll, copy.filterPrivate, copy.filterPublic],
  );

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        sport: sportCode,
        limit: PAGE_SIZE.toString(),
      });
      if (search) params.set("q", search);
      if (visibility) params.set("visibility", visibility);
      const response = await fetch(`/api/groups?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      setGroups(data.groups ?? []);
      setCount(data.count ?? 0);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [sportCode, search, visibility]);

  const handleReset = () => {
    setSearch("");
    setVisibility("");
  };

  const renderSessions = (group: GroupRecord) => {
    if (!group.group_sessions || group.group_sessions.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          {copy.sessionsLabel}: {copy.scheduleAnytime}
        </p>
      );
    }
    return (
      <ul className="space-y-1 text-sm text-slate-600">
        {group.group_sessions.slice(0, 3).map((session, index) => {
          const dayLabel = dayLabels[session.day] ?? session.day;
          const start = formatTime(session.start_time);
          const end = formatTime(session.end_time);
          const timeRange =
            start && end ? `${start} – ${end}` : copy.scheduleAnytime;
          const courtName = session.courts?.name;
          return (
            <li key={`${group.id}-${session.day}-${index}`}>
              {dayLabel} · {timeRange}
              {courtName ? ` @ ${courtName}` : ""}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.searchPlaceholder}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="w-full md:w-64">
            <p className="text-sm font-semibold text-slate-700">
              {copy.visibilityLabel}
            </p>
            <div className="mt-2 flex gap-2">
              {visibilityOptions.map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() =>
                    setVisibility(
                      option.value === visibility ? "" : option.value,
                    )
                  }
                  className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    option.value === visibility
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between text-sm text-slate-500">
          <p>
            {count.toLocaleString("en-US")} groups ·{" "}
            {loading ? "loading..." : "live data"}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-700 underline-offset-4 hover:underline"
          >
            {copy.reset}
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
          <Link
            href={buildLocalizedPath("/", locale)}
            className="mt-6 inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            {copy.backLink}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {groups.map((group) => {
            const primaryPhoto =
              group.group_photos?.find((photo) => photo.is_primary)
                ?.image_url ??
              group.group_photos?.[0]?.image_url ??
              fallbackImage;
            const privacyChip = group.is_public
              ? copy.privacyPublic
              : copy.privacyPrivate;
            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}${localeQuery}`}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-md shadow-slate-200 transition hover:-translate-y-1"
              >
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                  <div className="relative h-36 w-full">
                    <Image
                      src={primaryPhoto}
                      alt={group.name ?? "Group photo"}
                      fill
                      sizes="(max-width:768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {group.name ?? "Community group"}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
                {renderSessions(group)}
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span
                    className="inline-flex rounded-full px-3 py-1"
                    style={{ backgroundColor: `${accent}15`, color: accent }}
                  >
                    {privacyChip}
                  </span>
                  {group.updated_at && (
                    <span className="text-[11px] text-slate-400">
                      {copy.lastUpdated}{" "}
                      {new Date(group.updated_at).toLocaleDateString("en-US")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
