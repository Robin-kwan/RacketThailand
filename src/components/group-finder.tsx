"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  initialSearch?: string;
  initialDay?: string;
  initialPlayFormat?: string;
  initialAllowWalkIn?: string;
};

const PAGE_SIZE = 12;
type LocationState = { latitude: number; longitude: number };

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
  initialSearch = "",
  initialDay = "",
  initialPlayFormat = "",
  initialAllowWalkIn = "",
}: GroupFinderProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search);
  const [dayFilter, setDayFilter] = useState(initialDay);
  const [playFormatFilter, setPlayFormatFilter] = useState(initialPlayFormat);
  const [walkInFilter, setWalkInFilter] = useState(initialAllowWalkIn);
  const [serverGroups, setServerGroups] = useState(initialGroups);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
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
    pathname,
    playFormatFilter,
    walkInFilter,
  ]);

  useEffect(() => {
    setServerGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        sport: sportCode,
        lang: locale,
        limit: PAGE_SIZE.toString(),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dayFilter) params.set("day", dayFilter);
      if (playFormatFilter) params.set("playFormat", playFormatFilter);
      if (walkInFilter) params.set("allowWalkIn", walkInFilter);
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
  }, [
    sportCode,
    locale,
    debouncedSearch,
    dayFilter,
    playFormatFilter,
    walkInFilter,
  ]);

  const handleReset = () => {
    track("finder_filter_used", {
      surface: "group_finder",
      sport: sportCode,
      cta: "reset_filters",
    });
    setSearch("");
    setDayFilter("");
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
  const count = filteredGroups.length;
  const countSummary =
    locale === "th"
      ? `${count.toLocaleString("th-TH")} กลุ่ม · ${loading ? "กำลังอัปเดตข้อมูล" : "ข้อมูลล่าสุด"}`
      : `${count.toLocaleString("en-US")} groups · ${loading ? "loading..." : "live data"}`;

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
            name: session.courts?.name ?? (locale === "th" ? "สนาม" : "Court"),
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
        <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            className="mt-5 inline-flex rounded-full bg-[var(--rt-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3">
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
                sessions={group.group_sessions ?? []}
                playFormat={group.play_format ?? null}
                allowWalkIn={group.allow_walk_in ?? null}
                dayLabels={dayLabels}
                scheduleAnytime={copy.scheduleAnytime}
                locale={locale}
                showSessions={false}
                showDescription={false}
                showLocation={false}
                distanceLabel={distanceLabel}
                courtSportCode={sportCode}
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
