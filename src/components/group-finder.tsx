"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { GroupRecord } from "@/server/groupFinder";
import {
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";
import { NearbyMap, type NearbyMapCourt } from "@/components/nearby-map";
import { useDebounce } from "@/hooks/use-debounce";
import { GroupCard } from "@/components/group-card";
import { TimePickerField } from "@/components/time-picker-field";

type GroupFinderCopy = {
  searchPlaceholder: string;
  reset: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  sessionsLabel: string;
  scheduleAnytime: string;
  dayFilterLabel: string;
  anyDayLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  timeClearLabel: string;
  playFormatFilterLabel: string;
  anyPlayFormatLabel: string;
  playFormatSingle: string;
  playFormatDouble: string;
  walkInFilterLabel: string;
  anyWalkInLabel: string;
  walkInsWelcome: string;
  walkInsClosed: string;
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
  createGroupCta: string;
};

type GroupFinderProps = {
  sportCode: string;
  locale: Locale;
  fallbackImage: string;
  copy: GroupFinderCopy;
  dayLabels: Record<string, string>;
  initialGroups: GroupRecord[];
  total: number;
  initialSearch?: string;
  initialDay?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialPlayFormat?: string;
  initialAllowWalkIn?: string;
};

const PAGE_SIZE = 12;
const NEARBY_CANDIDATE_LIMIT = 300;
type LocationState = { latitude: number; longitude: number };
type NearbyCandidateCourt = {
  id: string;
  name: string | null | undefined;
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
};

const parseCoordinate = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function GroupFinder({
  sportCode,
  locale,
  fallbackImage,
  copy,
  dayLabels,
  initialGroups,
  total,
  initialSearch = "",
  initialDay = "",
  initialStartTime = "",
  initialEndTime = "",
  initialPlayFormat = "",
  initialAllowWalkIn = "",
}: GroupFinderProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search);
  const [dayFilter, setDayFilter] = useState(initialDay);
  const [startTimeFilter, setStartTimeFilter] = useState(initialStartTime);
  const [endTimeFilter, setEndTimeFilter] = useState(initialEndTime);
  const [playFormatFilter, setPlayFormatFilter] = useState(initialPlayFormat);
  const [walkInFilter, setWalkInFilter] = useState(initialAllowWalkIn);
  const [serverGroups, setServerGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(total);
  const [hasMore, setHasMore] = useState(initialGroups.length < total);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
  const [allowAutoLoadMore, setAllowAutoLoadMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasSkippedInitialLoadRef = useRef(false);
  const fallbackGroupName =
    locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackGroupPhotoAlt =
    locale === "th" ? "รูปกลุ่ม" : "Group photo";
  const buildCourtHref = useCallback(
    (courtId: string) =>
      buildLocalizedPath(
        `/courts/${courtId}?sport=${encodeURIComponent(sportCode)}`,
        locale,
      ),
    [locale, sportCode],
  );
  const distanceUnit = locale === "th" ? "กม." : "km";
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const entries = [
      ["search", debouncedSearch],
      ["day", dayFilter],
      ["startTime", startTimeFilter],
      ["endTime", endTimeFilter],
      ["playFormat", playFormatFilter],
      ["allowWalkIn", walkInFilter],
    ] as const;
    entries.forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    dayFilter,
    debouncedSearch,
    endTimeFilter,
    pathname,
    playFormatFilter,
    startTimeFilter,
    walkInFilter,
  ]);

  useEffect(() => {
    setServerGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (
        !hasSkippedInitialLoadRef.current &&
        !prioritizeNearby &&
        !userLocation &&
        debouncedSearch === initialSearch &&
        dayFilter === initialDay &&
        startTimeFilter === initialStartTime &&
        endTimeFilter === initialEndTime &&
        playFormatFilter === initialPlayFormat &&
        walkInFilter === initialAllowWalkIn
      ) {
        hasSkippedInitialLoadRef.current = true;
        return;
      }
      hasSkippedInitialLoadRef.current = true;
      setLoading(true);
      const isNearbyMode = prioritizeNearby && Boolean(userLocation);
      const params = new URLSearchParams({
        sport: sportCode,
        lang: locale,
        limit: (
          isNearbyMode ? NEARBY_CANDIDATE_LIMIT : PAGE_SIZE
        ).toString(),
      });
      if (isNearbyMode && userLocation) {
        params.set("nearbyLat", String(userLocation.latitude));
        params.set("nearbyLng", String(userLocation.longitude));
      }
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dayFilter) params.set("day", dayFilter);
      if (startTimeFilter) params.set("startTime", startTimeFilter);
      if (endTimeFilter) params.set("endTime", endTimeFilter);
      if (playFormatFilter) params.set("playFormat", playFormatFilter);
      if (walkInFilter) params.set("allowWalkIn", walkInFilter);
      const response = await fetch(`/api/groups?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      const nextGroups = (data.groups ?? []) as GroupRecord[];
      const nextCount = data.count ?? nextGroups.length;
      setServerGroups(nextGroups);
      setCount(nextCount);
      setPage(1);
      setHasMore(!isNearbyMode && nextGroups.length < nextCount);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [
    sportCode,
    locale,
    debouncedSearch,
    dayFilter,
    playFormatFilter,
    walkInFilter,
    startTimeFilter,
    endTimeFilter,
    initialAllowWalkIn,
    initialDay,
    initialEndTime,
    initialPlayFormat,
    initialSearch,
    initialStartTime,
    prioritizeNearby,
    userLocation,
  ]);

  const loadMoreGroups = useCallback(async () => {
    if (loading || loadingMore || !hasMore || prioritizeNearby) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        sport: sportCode,
        lang: locale,
        limit: PAGE_SIZE.toString(),
        offset: String((nextPage - 1) * PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dayFilter) params.set("day", dayFilter);
      if (startTimeFilter) params.set("startTime", startTimeFilter);
      if (endTimeFilter) params.set("endTime", endTimeFilter);
      if (playFormatFilter) params.set("playFormat", playFormatFilter);
      if (walkInFilter) params.set("allowWalkIn", walkInFilter);

      const response = await fetch(`/api/groups?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        return;
      }

      const nextGroups = (data.groups ?? []) as GroupRecord[];
      const nextCount = data.count ?? count;
      setCount(nextCount);
      setPage(nextPage);
      setServerGroups((previous) => {
        const merged = new Map(previous.map((group) => [group.id, group]));
        nextGroups.forEach((group) => merged.set(group.id, group));
        const values = Array.from(merged.values());
        setHasMore(values.length < nextCount);
        return values;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [
    count,
    dayFilter,
    debouncedSearch,
    hasMore,
    loading,
    loadingMore,
    locale,
    page,
    playFormatFilter,
    prioritizeNearby,
    sportCode,
    startTimeFilter,
    endTimeFilter,
    walkInFilter,
  ]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || !allowAutoLoadMore || prioritizeNearby) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          void loadMoreGroups();
        }
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [allowAutoLoadMore, hasMore, loadMoreGroups, prioritizeNearby]);

  const handleReset = () => {
    track("finder_filter_used", {
      surface: "group_finder",
      sport: sportCode,
      cta: "reset_filters",
    });
    setSearch("");
    setDayFilter("");
    setStartTimeFilter("");
    setEndTimeFilter("");
    setPlayFormatFilter("");
    setWalkInFilter("");
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

  const playFormatOptions = useMemo(
    () => [
      { value: "", label: copy.anyPlayFormatLabel },
      { value: "double", label: copy.playFormatDouble },
      { value: "single", label: copy.playFormatSingle },
    ],
    [
      copy.anyPlayFormatLabel,
      copy.playFormatDouble,
      copy.playFormatSingle,
    ],
  );
  const walkInOptions = useMemo(
    () => [
      { value: "", label: copy.anyWalkInLabel },
      { value: "true", label: copy.walkInsWelcome },
      { value: "false", label: copy.walkInsClosed },
    ],
    [copy.anyWalkInLabel, copy.walkInsWelcome, copy.walkInsClosed],
  );
  const filteredGroups = serverGroups;
  const countSummary =
    locale === "th"
      ? `${count.toLocaleString("th-TH")} กลุ่ม · ${loading ? "กำลังอัปเดตข้อมูล" : "ข้อมูลล่าสุด"}`
      : `${count.toLocaleString("en-US")} groups · ${loading ? "loading..." : "live data"}`;
  const loadingMoreLabel =
    locale === "th" ? "กำลังโหลดกลุ่มเพิ่ม..." : "Loading more groups...";

  const handleRequestNearby = () => {
    track("finder_filter_used", {
      surface: "group_finder",
      sport: sportCode,
      cta: "nearby",
    });
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

  useEffect(() => {
    if (typeof window === "undefined" || allowAutoLoadMore) return undefined;
    if (window.scrollY > 0) {
      setAllowAutoLoadMore(true);
      return undefined;
    }

    const enableAutoLoadMore = () => setAllowAutoLoadMore(true);
    window.addEventListener("scroll", enableAutoLoadMore, {
      passive: true,
      once: true,
    });
    window.addEventListener("wheel", enableAutoLoadMore, {
      passive: true,
      once: true,
    });
    window.addEventListener("touchmove", enableAutoLoadMore, {
      passive: true,
      once: true,
    });

    return () => {
      window.removeEventListener("scroll", enableAutoLoadMore);
      window.removeEventListener("wheel", enableAutoLoadMore);
      window.removeEventListener("touchmove", enableAutoLoadMore);
    };
  }, [allowAutoLoadMore]);

  const groupsWithLocation = useMemo(() => {
    return filteredGroups.map((group) => {
      const sessionsWithCoords =
        group.group_sessions?.filter((session) => {
          const lat = parseCoordinate(session.courts?.latitude);
          const lng = parseCoordinate(session.courts?.longitude);
          return lat !== null && lng !== null;
        }) ?? [];
      const linkedCourtsWithCoords =
        group.court_groups
          ?.map((link) => link.courts)
          .filter((court) => {
            const lat = parseCoordinate(court?.latitude);
            const lng = parseCoordinate(court?.longitude);
            return Boolean(court?.id) && lat !== null && lng !== null;
          }) ?? [];
      return { group, sessionsWithCoords, linkedCourtsWithCoords };
    });
  }, [filteredGroups]);

  const groupsWithDistance = useMemo(() => {
    return groupsWithLocation.map(({
      group,
      sessionsWithCoords,
      linkedCourtsWithCoords,
    }) => {
      if (!userLocation) {
        return {
          group,
          distanceKm: null as number | null,
          nearestCourt: null as NearbyMapCourt | null,
        };
      }
      const candidateCourts: NearbyCandidateCourt[] = [];
      const seenCourtIds = new Set<string>();
      sessionsWithCoords.forEach((session) => {
        if (session.courts?.id && !seenCourtIds.has(session.courts.id)) {
          seenCourtIds.add(session.courts.id);
          candidateCourts.push(session.courts);
        }
      });
      linkedCourtsWithCoords.forEach((court) => {
        if (court?.id && !seenCourtIds.has(court.id)) {
          seenCourtIds.add(court.id);
          candidateCourts.push(court);
        }
      });

      let bestDistance = Number.POSITIVE_INFINITY;
      let bestCourt: NearbyMapCourt | null = null;
      candidateCourts.forEach((court) => {
        const lat = parseCoordinate(court.latitude);
        const lng = parseCoordinate(court.longitude);
        const courtId = court.id;
        if (lat === null || lng === null || !courtId) return;
        const distance = haversineDistance(userLocation, {
          latitude: lat,
          longitude: lng,
        });
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCourt = {
            id: courtId,
            name: court.name ?? (locale === "th" ? "สนาม" : "Court"),
            latitude: lat,
            longitude: lng,
            href: buildCourtHref(courtId),
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
  }, [buildCourtHref, groupsWithLocation, locale, userLocation]);

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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.searchPlaceholder}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                track("finder_filter_used", {
                  surface: "group_finder",
                  sport: sportCode,
                  cta: "search",
                });
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
          <BaseSelect
            label={copy.dayFilterLabel}
            name="dayFilter"
            value={dayFilter}
            onChange={(event) => {
              setDayFilter(event.target.value);
              track("finder_filter_used", {
                surface: "group_finder",
                sport: sportCode,
                cta: "day",
              });
            }}
            options={dayOptions}
            variant="light"
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-2">
            <TimePickerField
              label={copy.startTimeLabel}
              value={startTimeFilter}
              placeholder="--:--"
              onChange={(value) => {
                setStartTimeFilter(value);
                track("finder_filter_used", {
                  surface: "group_finder",
                  sport: sportCode,
                  cta: "start_time",
                });
              }}
              allowClear
              clearLabel={copy.timeClearLabel}
              className="min-w-0"
            />
            <TimePickerField
              label={copy.endTimeLabel}
              value={endTimeFilter}
              placeholder="--:--"
              onChange={(value) => {
                setEndTimeFilter(value);
                track("finder_filter_used", {
                  surface: "group_finder",
                  sport: sportCode,
                  cta: "end_time",
                });
              }}
              allowClear
              clearLabel={copy.timeClearLabel}
              className="min-w-0"
            />
          </div>
          <BaseSelect
            label={copy.playFormatFilterLabel}
            name="playFormatFilter"
            value={playFormatFilter}
            onChange={(event) => {
              setPlayFormatFilter(event.target.value);
              track("finder_filter_used", {
                surface: "group_finder",
                sport: sportCode,
                cta: "play_format",
              });
            }}
            options={playFormatOptions}
            variant="light"
          />
          <BaseSelect
            label={copy.walkInFilterLabel}
            name="walkInFilter"
            value={walkInFilter}
            onChange={(event) => {
              setWalkInFilter(event.target.value);
              track("finder_filter_used", {
                surface: "group_finder",
                sport: sportCode,
                cta: "walk_in",
              });
            }}
            options={walkInOptions}
            variant="light"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>{countSummary}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestNearby}
              disabled={locatingNearby}
              className="rt-btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500"
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
          <p
            className={`mt-2 text-sm ${
              nearbyStatus === copy.nearbyDenied
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            {nearbyStatus}
          </p>
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
                      {entry.group.name ?? fallbackGroupName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {copy.distanceLabel}: {entry.distanceKm?.toFixed(2)} {distanceUnit}
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
                      {entry.group.name ?? fallbackGroupName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {copy.distanceLabel}: {entry.distanceKm?.toFixed(2)} {distanceUnit}
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
          <Link
            href={buildLocalizedPath(
              `/groups/create?sport=${encodeURIComponent(sportCode)}`,
              locale,
            )}
            className="rt-btn-group mt-5 inline-flex items-center justify-center px-4 py-2 text-xs"
            onClick={() =>
              track("empty_state_cta_click", {
                surface: "group_finder",
                sport: sportCode,
                cta: "create_group",
              })
            }
          >
            {copy.createGroupCta}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
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
                  ? `${copy.distanceLabel}: ${distanceKm.toFixed(1)} ${distanceUnit}`
                  : null;
              return (
                <GroupCard
                  key={group.id}
                  href={groupHref}
                  name={group.name ?? fallbackGroupName}
                  imageUrl={primaryPhoto}
                  imageAlt={group.name ?? fallbackGroupPhotoAlt}
                  description={group.description}
                  sessions={group.group_sessions ?? []}
                  playFormat={group.play_format ?? null}
                  allowWalkIn={group.allow_walk_in ?? null}
                  dayLabels={dayLabels}
                  scheduleAnytime={copy.scheduleAnytime}
                  locale={locale}
                  showSessions={false}
                  showDescription
                  showLocation={false}
                  distanceLabel={distanceLabel}
                  courtSportCode={sportCode}
                />
              );
            })}
          </div>
          {hasMore && !prioritizeNearby && (
            <div
              ref={sentinelRef}
              className="flex min-h-16 items-center justify-center text-sm text-slate-500"
            >
              {loadingMore ? loadingMoreLabel : ""}
            </div>
          )}
        </>
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
