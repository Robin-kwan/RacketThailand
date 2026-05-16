"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import type { CasualPlayRecord } from "@/server/casualPlays";
import { CasualPlayCard } from "@/components/casual-play-card";
import { NearbyMap, type NearbyMapCourt } from "@/components/nearby-map";
import { useDebounce } from "@/hooks/use-debounce";
import {
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { getThailandTodayDateString } from "@/lib/casual-play";

type CasualPlayFinderCopy = {
  searchPlaceholder: string;
  reset: string;
  emptyTitle: string;
  emptyDescription: string;
  dateLabel: string;
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
  createCta: string;
};

type CasualPlayFinderProps = {
  sportCode: string;
  locale: Locale;
  copy: CasualPlayFinderCopy;
  initialPlays: CasualPlayRecord[];
};

const PAGE_SIZE = 12;
const EARTH_RADIUS_KM = 6371;
const TODAY_DATE = getThailandTodayDateString();

type LocationState = { latitude: number; longitude: number };

const parseCoordinate = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

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

export function CasualPlayFinder({
  sportCode,
  locale,
  copy,
  initialPlays,
}: CasualPlayFinderProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [serverPlays, setServerPlays] = useState(initialPlays);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
  const debouncedSearch = useDebounce(search);
  const fallbackTitle =
    locale === "th" ? "หาเพื่อนตี" : "Casual play";
  const distanceUnit = locale === "th" ? "กม." : "km";
  const buildCourtHref = useCallback(
    (courtId: string) =>
      buildLocalizedPath(
        `/courts/${courtId}?sport=${encodeURIComponent(sportCode)}`,
        locale,
      ),
    [locale, sportCode],
  );

  useEffect(() => {
    setServerPlays(initialPlays);
  }, [initialPlays]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        sport: sportCode,
        limit: PAGE_SIZE.toString(),
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (dateFilter) params.set("date", dateFilter);

      const response = await fetch(`/api/casual-plays?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!active) return;
      setServerPlays(data?.plays ?? []);
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [sportCode, debouncedSearch, dateFilter]);

  const handleReset = () => {
    track("finder_filter_used", {
      surface: "casual_play_finder",
      sport: sportCode,
      cta: "reset_filters",
    });
    setSearch("");
    setDateFilter("");
    setPrioritizeNearby(false);
    setNearbyStatus(null);
  };

  const handleRequestNearby = () => {
    track("finder_filter_used", {
      surface: "casual_play_finder",
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
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
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

  const playsWithDistance = useMemo(() => {
    return serverPlays.map((play) => {
      const latitude = parseCoordinate(play.courts?.latitude);
      const longitude = parseCoordinate(play.courts?.longitude);
      const courtId = play.courts?.id ?? play.court_id;
      if (
        latitude === null ||
        longitude === null ||
        !userLocation ||
        !courtId
      ) {
        return {
          play,
          distanceKm: null as number | null,
          nearestCourt: null as NearbyMapCourt | null,
        };
      }

      return {
        play,
        distanceKm: haversineDistance(userLocation, {
          latitude,
          longitude,
        }),
        nearestCourt: {
          id: courtId,
          name: play.courts?.name ?? (locale === "th" ? "สนาม" : "Court"),
          latitude,
          longitude,
          href: buildCourtHref(courtId),
        },
      };
    });
  }, [buildCourtHref, locale, serverPlays, userLocation]);

  const displayedPlays = useMemo(() => {
    if (prioritizeNearby && userLocation) {
      return [...playsWithDistance].sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }
    return playsWithDistance;
  }, [playsWithDistance, prioritizeNearby, userLocation]);

  const mapCourts = useMemo(() => {
    const courtMap = new Map<string, NearbyMapCourt>();
    displayedPlays.forEach(({ nearestCourt }) => {
      if (nearestCourt && !courtMap.has(nearestCourt.id)) {
        courtMap.set(nearestCourt.id, nearestCourt);
      }
    });
    return Array.from(courtMap.values()).slice(0, 15);
  }, [displayedPlays]);

  const getVenueName = (play: CasualPlayRecord) =>
    play.courts?.name ??
    play.venue_name ??
    (locale === "th" ? "ยังไม่ระบุสถานที่" : "Venue not set");

  const getLocationLabel = (play: CasualPlayRecord) => {
    const districtLine = [play.courts?.district, play.courts?.province]
      .filter(Boolean)
      .join(" · ");
    return [play.location_note, districtLine].filter(Boolean).join(" · ") || null;
  };

  const count = displayedPlays.length;
  const countSummary =
    locale === "th"
      ? `${count.toLocaleString("th-TH")} โพสต์ · ${loading ? "กำลังอัปเดตข้อมูล" : "ข้อมูลล่าสุด"}`
      : `${count.toLocaleString("en-US")} plays · ${loading ? "loading..." : "live data"}`;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-[1.7fr_1fr]">
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
                  surface: "casual_play_finder",
                  sport: sportCode,
                  cta: "search",
                });
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.dateLabel}
            </label>
            <input
              type="date"
              value={dateFilter}
              min={TODAY_DATE}
              onChange={(event) => {
                setDateFilter(event.target.value);
                track("finder_filter_used", {
                  surface: "casual_play_finder",
                  sport: sportCode,
                  cta: "date",
                });
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400 focus:ring-offset-0"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>{countSummary}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestNearby}
              disabled={locatingNearby}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-500 disabled:bg-slate-500 disabled:text-white"
            >
              {locatingNearby ? copy.nearbyFinding : copy.nearbyButton}
            </button>
            {prioritizeNearby && (
              <button
                type="button"
                onClick={() => {
                  setPrioritizeNearby(false);
                  setNearbyStatus(null);
                }}
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
            {displayedPlays
              .filter((entry) => entry.distanceKm !== null)
              .slice(0, 4)
              .map((entry) => (
                <div
                  key={`nearby-${entry.play.id}`}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.play.title ?? fallbackTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      {copy.distanceLabel}: {entry.distanceKm?.toFixed(2)}{" "}
                      {distanceUnit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getVenueName(entry.play)}
                    </p>
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

      {displayedPlays.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
          <Link
            href={buildLocalizedPath(
              `/casual-plays/create?sport=${encodeURIComponent(sportCode)}`,
              locale,
            )}
            className="mt-5 inline-flex rounded-full bg-[var(--rt-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
            onClick={() =>
              track("empty_state_cta_click", {
                surface: "casual_play_finder",
                sport: sportCode,
                cta: "create_casual_play",
              })
            }
          >
            {copy.createCta}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {displayedPlays.map(({ play, distanceKm }) => {
            const location = getLocationLabel(play);
            const distanceLabel =
              distanceKm !== null
                ? `${copy.distanceLabel}: ${distanceKm.toFixed(1)} ${distanceUnit}`
                : null;

            return (
              <CasualPlayCard
                key={play.id}
                href={buildLocalizedPath(`/casual-plays/${play.id}`, locale)}
                title={play.title ?? fallbackTitle}
                description={play.description}
                venueName={getVenueName(play)}
                location={location}
                playDate={play.play_date}
                startTime={play.start_time}
                endTime={play.end_time}
                playFormat={play.play_format ?? null}
                playerAmount={play.player_amount ?? null}
                acceptedCount={play.accepted_count ?? null}
                locale={locale}
                distanceLabel={distanceLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
