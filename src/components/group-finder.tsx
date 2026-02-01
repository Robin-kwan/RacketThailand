"use client";

import { useEffect, useMemo, useState } from "react";
import type { GroupRecord } from "@/server/groupFinder";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";
import { NearbyMap, type NearbyMapCourt } from "@/components/nearby-map";
import { useDebounce } from "@/hooks/use-debounce";
import { GroupCard } from "@/components/group-card";

type GroupFinderCopy = {
  searchPlaceholder: string;
  reset: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  sessionsLabel: string;
  scheduleAnytime: string;
  lastUpdated: string;
  dayFilterLabel: string;
  anyDayLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  anyTimeLabel: string;
  nearbyButton: string;
  nearbyFinding: string;
  nearbyClear: string;
  nearbyUnsupported: string;
  nearbyDenied: string;
  nearbyActive: string;
  distanceLabel: string;
  mapHeading: string;
  nearbyListTitle: string;
  openMaps: string;
  playerAmountLabel: string;
  phoneLabel: string;
  lineLabel: string;
};

type GroupFinderProps = {
  sportCode: string;
  locale: Locale;
  fallbackImage: string;
  copy: GroupFinderCopy;
  dayLabels: Record<string, string>;
  initialGroups: GroupRecord[];
};

const PAGE_SIZE = 12;
type LocationState = { latitude: number; longitude: number };

const TIME_VALUES = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
    .toString()
    .padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const MINUTES_IN_DAY = 24 * 60;

const parseCoordinate = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function formatTimeFilterLabel(value: string, locale: Locale) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatter.format(date);
}

function timeStringToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function normalizeEndMinutes(
  startMinutes: number | null,
  endMinutes: number | null,
) {
  if (endMinutes === null || startMinutes === null) {
    return endMinutes;
  }
  if (endMinutes <= startMinutes) {
    return endMinutes + MINUTES_IN_DAY;
  }
  return endMinutes;
}

function adjustRangeForFilter(
  startMinutes: number | null,
  endMinutes: number | null,
) {
  if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
    return {
      start: startMinutes,
      end: endMinutes + MINUTES_IN_DAY,
    };
  }
  return { start: startMinutes, end: endMinutes };
}

function filterGroupsByTime(
  groups: GroupRecord[],
  startTime: string,
  endTime: string,
) {
  const filterStartMinutes = timeStringToMinutes(startTime);
  const filterEndMinutesRaw = timeStringToMinutes(endTime);
  const { start: filterStart, end: filterEnd } = adjustRangeForFilter(
    filterStartMinutes,
    filterEndMinutesRaw,
  );
  if (filterStart === null && filterEnd === null) {
    return groups;
  }
  return groups.filter((group) => {
    const sessions = group.group_sessions;
    if (!sessions || sessions.length === 0) {
      return false;
    }
    return sessions.some((session) => {
      const sessionStart = timeStringToMinutes(session.start_time);
      const sessionEndRaw = timeStringToMinutes(session.end_time);
      if (sessionStart === null || sessionEndRaw === null) {
        return false;
      }
      const sessionEnd = normalizeEndMinutes(sessionStart, sessionEndRaw);
      const matchesStart =
        filterStart === null || sessionEnd === null || sessionEnd >= filterStart;
      const matchesEnd =
        filterEnd === null || sessionStart <= filterEnd;
      return matchesStart && matchesEnd;
    });
  });
}

export function GroupFinder({
  sportCode,
  locale,
  fallbackImage,
  copy,
  dayLabels,
  initialGroups,
}: GroupFinderProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dayFilter, setDayFilter] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [serverGroups, setServerGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
  useEffect(() => {
    setServerGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        sport: sportCode,
        limit: PAGE_SIZE.toString(),
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (dayFilter) params.set("day", dayFilter);
      const response = await fetch(`/api/groups?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      setServerGroups(data.groups ?? []);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [sportCode, debouncedSearch, dayFilter]);

  const handleReset = () => {
    setSearch("");
    setDayFilter("");
    setStartTime("");
    setEndTime("");
    setPrioritizeNearby(false);
    setNearbyStatus(null);
  };

  const dayOptions = useMemo(
    () => [
      { value: "", label: copy.anyDayLabel },
      ...Object.entries(dayLabels).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [copy.anyDayLabel, dayLabels],
  );

  const timeOptions = useMemo(
    () => [
      { value: "", label: copy.anyTimeLabel },
      ...TIME_VALUES.map((value) => ({
        value,
        label: formatTimeFilterLabel(value, locale),
      })),
    ],
    [copy.anyTimeLabel, locale],
  );

  const endTimeOptions = useMemo(() => {
    if (!startTime) return timeOptions;
    const startMinutes = timeStringToMinutes(startTime);
    if (startMinutes === null) {
      return timeOptions;
    }
    return [
      { value: "", label: copy.anyTimeLabel },
      ...TIME_VALUES.filter((time) => {
        const optionMinutes = timeStringToMinutes(time);
        if (optionMinutes === null) return false;
        const normalizedOption =
          optionMinutes === 0 ? MINUTES_IN_DAY : optionMinutes;
        return normalizedOption > startMinutes;
      }).map((value) => ({
        value,
        label: formatTimeFilterLabel(value, locale),
      })),
    ];
  }, [copy.anyTimeLabel, startTime, locale, timeOptions]);

  const filteredGroups = useMemo(
    () => filterGroupsByTime(serverGroups, startTime, endTime),
    [serverGroups, startTime, endTime],
  );
  const count = filteredGroups.length;

  const handleRequestNearby = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setNearbyStatus(copy.nearbyUnsupported);
      return;
    }
    setLocatingNearby(true);
    setNearbyStatus(copy.nearbyFinding);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LocationState = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setPrioritizeNearby(true);
        setNearbyStatus(copy.nearbyActive);
        setLocatingNearby(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setNearbyStatus(copy.nearbyDenied);
        } else {
          setNearbyStatus(copy.nearbyUnsupported);
        }
        setLocatingNearby(false);
      },
    );
  };

  const handleClearNearby = () => {
    setPrioritizeNearby(false);
    setNearbyStatus(null);
  };

  const groupsWithLocation = useMemo(() => {
    return filteredGroups.map((group) => {
      const sessionsWithCoords =
        group.group_sessions?.filter((session) => {
          const lat = parseCoordinate(session.courts?.latitude);
          const lng = parseCoordinate(session.courts?.longitude);
          return lat !== null && lng !== null;
        }) ?? [];
      return { group, sessionsWithCoords };
    });
  }, [filteredGroups]);

  const groupsWithDistance = useMemo(() => {
    return groupsWithLocation.map(({ group, sessionsWithCoords }) => {
      if (!userLocation) {
        return {
          group,
          distanceKm: null as number | null,
          nearestCourt: null as NearbyMapCourt | null,
        };
      }
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestCourt: NearbyMapCourt | null = null;
      sessionsWithCoords.forEach((session) => {
        const lat = parseCoordinate(session.courts?.latitude);
        const lng = parseCoordinate(session.courts?.longitude);
        const courtId = session.courts?.id;
        if (lat === null || lng === null || !courtId) return;
        const distance = haversineDistance(userLocation, {
          latitude: lat,
          longitude: lng,
        });
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCourt = {
            id: courtId,
            name: session.courts?.name ?? "Court",
            latitude: lat,
            longitude: lng,
            href: `/courts/${courtId}${locale === DEFAULT_LOCALE ? "" : `?lang=${locale}`}`,
          };
        }
      });
      return {
        group,
        distanceKm:
          bestCourt && Number.isFinite(bestDistance) ? bestDistance : null,
        nearestCourt: bestCourt,
      };
    });
  }, [groupsWithLocation, userLocation, locale]);

  const displayedGroups = useMemo(() => {
    if (prioritizeNearby && userLocation) {
      return [...groupsWithDistance].sort((a, b) => {
        const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDist - bDist;
      });
    }
    return groupsWithDistance;
  }, [groupsWithDistance, prioritizeNearby, userLocation]);

  const mapCourts = useMemo(() => {
    const courtMap = new Map<string, NearbyMapCourt>();
    groupsWithDistance.forEach(({ nearestCourt }) => {
      if (nearestCourt && !courtMap.has(nearestCourt.id)) {
        courtMap.set(nearestCourt.id, nearestCourt);
      }
    });
    return Array.from(courtMap.values()).slice(0, 15);
  }, [groupsWithDistance]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="space-y-2">
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
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <BaseSelect
            label={copy.dayFilterLabel}
            name="dayFilter"
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            options={dayOptions}
            variant="light"
          />
          <BaseSelect
            label={copy.startTimeLabel}
            name="startTime"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            options={timeOptions}
            variant="light"
          />
          <BaseSelect
            label={copy.endTimeLabel}
            name="endTime"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            options={endTimeOptions}
            variant="light"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            {count.toLocaleString("en-US")} groups ·{" "}
            {loading ? "loading..." : "live data"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestNearby}
              disabled={locatingNearby}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-500 disabled:bg-slate-500 disabled:text-white disabled:border-slate-500 disabled:cursor-not-allowed"
            >
              {locatingNearby ? copy.nearbyFinding : copy.nearbyButton}
            </button>
            {prioritizeNearby && (
              <button
                type="button"
                onClick={handleClearNearby}
                className="text-slate-700 underline-offset-4 hover:underline"
              >
                {copy.nearbyClear}
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-700 underline-offset-4 hover:underline"
            >
              {copy.reset}
            </button>
          </div>
        </div>
        {nearbyStatus && (
          <p className="mt-2 text-sm text-slate-500">{nearbyStatus}</p>
        )}
      </div>

      {prioritizeNearby && userLocation && mapCourts.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.mapHeading}
          </p>
          <div className="mt-4">
            <NearbyMap userLocation={userLocation} courts={mapCourts} />
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {copy.nearbyListTitle}
            </p>
            {displayedGroups
              .filter((entry) => entry.distanceKm !== null)
              .slice(0, 4)
              .map((entry) => (
                <div
                  key={`nearby-${entry.group.id}`}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.group.name ?? "Community group"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {copy.distanceLabel}: {entry.distanceKm?.toFixed(2)} km
                    </p>
                    {typeof entry.group.player_amount === "number" &&
                      Number.isFinite(entry.group.player_amount) && (
                        <p className="text-xs text-slate-500">
                          {copy.playerAmountLabel}: {entry.group.player_amount}
                        </p>
                      )}
                  </div>
                  {entry.nearestCourt && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${entry.nearestCourt.latitude},${entry.nearestCourt.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {copy.openMaps}
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {prioritizeNearby && userLocation && mapCourts.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.nearbyListTitle}
          </p>
          <div className="mt-4 space-y-3">
            {displayedGroups
              .filter((entry) => entry.distanceKm !== null)
              .slice(0, 4)
              .map((entry) => (
                <div
                  key={`nearby-${entry.group.id}`}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.group.name ?? "Community group"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {copy.distanceLabel}: {entry.distanceKm?.toFixed(2)} km
                    </p>
                    {typeof entry.group.player_amount === "number" &&
                      Number.isFinite(entry.group.player_amount) && (
                        <p className="text-xs text-slate-500">
                          {copy.playerAmountLabel}: {entry.group.player_amount}
                        </p>
                      )}
                  </div>
                  {entry.nearestCourt && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${entry.nearestCourt.latitude},${entry.nearestCourt.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {copy.openMaps}
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {displayedGroups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayedGroups.map((entry) => {
            const { group, distanceKm } = entry;
            const primaryPhoto =
              group.group_photos?.find((photo) => photo.is_primary)
                ?.image_url ??
              group.group_photos?.[0]?.image_url ??
              fallbackImage;
            const groupHref = buildLocalizedPath(`/groups/${group.id}`, locale);
            const distanceLabel =
              distanceKm !== null
                ? `${copy.distanceLabel}: ${distanceKm.toFixed(1)} km`
                : null;
            return (
              <GroupCard
                key={group.id}
                href={groupHref}
                name={group.name ?? "Community group"}
                imageUrl={primaryPhoto}
                imageAlt={group.name ?? "Group photo"}
                sessions={group.group_sessions ?? []}
                dayLabels={dayLabels}
                scheduleAnytime={copy.scheduleAnytime}
                locale={locale}
                showSessions
                showDescription={false}
                showLocation={false}
                distanceLabel={distanceLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
const EARTH_RADIUS_KM = 6371;

const haversineDistance = (a: LocationState, b: LocationState) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const haversine =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * c;
};
