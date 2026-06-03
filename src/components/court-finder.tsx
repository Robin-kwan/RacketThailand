"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { CourtProvinceOption, CourtRecord } from "@/server/courtFinder";
import {
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";
import { NearbyMap } from "@/components/nearby-map";
import { useDebounce } from "@/hooks/use-debounce";
import { CourtCard } from "@/components/court-card";

type CourtFinderCopy = {
  searchPlaceholder: string;
  provinceLabel: string;
  resetFilters: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  nearbyButton: string;
  nearbyFinding: string;
  nearbyClear: string;
  nearbyUnsupported: string;
  nearbyDenied: string;
  nearbyActive: string;
  distanceLabel: string;
  mapHeading: string;
  openMaps: string;
  addCourtCta: string;
};

type CourtFinderProps = {
  sportCode: string;
  locale: Locale;
  copy: CourtFinderCopy;
  initialCourts: CourtRecord[];
  provinces: CourtProvinceOption[];
  total: number;
  initialSearch?: string;
  initialProvince?: string;
};

const PAGE_SIZE = 12;

type LocationState = {
  latitude: number;
  longitude: number;
};

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

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

export function CourtFinder({
  sportCode,
  locale,
  copy,
  initialCourts,
  provinces,
  total,
  initialSearch = "",
  initialProvince = "",
}: CourtFinderProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search);
  const [province, setProvince] = useState<string>(initialProvince);
  const [courts, setCourts] = useState(initialCourts);
  const [availableProvinces, setAvailableProvinces] =
    useState<CourtProvinceOption[]>(provinces);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(total);
  const [hasMore, setHasMore] = useState(initialCourts.length < total);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
  const [allowAutoLoadMore, setAllowAutoLoadMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedRequestKeyRef = useRef<string | null>(null);
  const buildCourtHref = useCallback(
    (courtId: string) =>
      buildLocalizedPath(
        `/courts/${courtId}?sport=${encodeURIComponent(sportCode)}`,
        locale,
      ),
    [locale, sportCode],
  );
  const provinceOptions = useMemo(
    () => [
      { value: "", label: copy.resetFilters },
      ...availableProvinces,
    ],
    [availableProvinces, copy.resetFilters],
  );
  const fallbackCourtName =
    locale === "th" ? "ยังไม่ระบุชื่อสนาม" : "Unnamed court";
  const fallbackCourtImageAlt =
    locale === "th" ? "รูปสนาม" : "Court image";
  const countSummary =
    locale === "th"
      ? `${count.toLocaleString("th-TH")} สนาม · ${loading ? "กำลังอัปเดตข้อมูล" : "ข้อมูลล่าสุด"}`
      : `${count.toLocaleString("en-US")} courts · ${loading ? "loading..." : "live data"}`;
  const distanceUnit = locale === "th" ? "กม." : "km";
  const loadingMoreLabel =
    locale === "th" ? "กำลังโหลดสนามเพิ่มเติม..." : "Loading more courts...";

  const courtListRequestQuery = useMemo(() => {
    const params = new URLSearchParams({
      sport: sportCode,
      lang: locale,
      limit: PAGE_SIZE.toString(),
      page: "1",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (province) params.set("province", province);
    if (prioritizeNearby && userLocation) {
      params.set("nearbyLat", String(userLocation.latitude));
      params.set("nearbyLng", String(userLocation.longitude));
      params.set("includeProvinces", "false");
    }
    return params.toString();
  }, [
    debouncedSearch,
    locale,
    prioritizeNearby,
    province,
    sportCode,
    userLocation,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    if (province) {
      params.set("province", province);
    } else {
      params.delete("province");
    }
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [debouncedSearch, pathname, province]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (lastLoadedRequestKeyRef.current === null) {
        lastLoadedRequestKeyRef.current = courtListRequestQuery;
        return;
      }
      if (lastLoadedRequestKeyRef.current === courtListRequestQuery) {
        return;
      }
      lastLoadedRequestKeyRef.current = courtListRequestQuery;
      setLoading(true);
      const response = await fetch(`/api/courts?${courtListRequestQuery}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      const nextCourts = data.courts ?? [];
      const nextCount = data.count ?? 0;
      setCourts(nextCourts);
      setCount(nextCount);
      setPage(1);
      setHasMore(nextCourts.length < nextCount);
      setAvailableProvinces(data.provinces ?? []);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [courtListRequestQuery]);

  const loadMoreCourts = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        sport: sportCode,
        lang: locale,
        limit: PAGE_SIZE.toString(),
        page: nextPage.toString(),
        includeProvinces: "false",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (province) params.set("province", province);
      if (prioritizeNearby && userLocation) {
        params.set("nearbyLat", String(userLocation.latitude));
        params.set("nearbyLng", String(userLocation.longitude));
      }
      const response = await fetch(`/api/courts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        return;
      }
      const nextCourts = (data.courts ?? []) as CourtRecord[];
      const nextCount = data.count ?? count;
      setCount(nextCount);
      setPage(nextPage);
      setCourts((previous) => {
        const merged = new Map(previous.map((court) => [court.id, court]));
        nextCourts.forEach((court) => merged.set(court.id, court));
        const values = Array.from(merged.values());
        setHasMore(values.length < nextCount);
        return values;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [
    count,
    debouncedSearch,
    hasMore,
    loading,
    loadingMore,
    page,
    province,
    prioritizeNearby,
    sportCode,
    locale,
    userLocation,
  ]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || !allowAutoLoadMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          void loadMoreCourts();
        }
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [allowAutoLoadMore, hasMore, loadMoreCourts]);

  const handleReset = () => {
    track("finder_filter_used", {
      surface: "court_finder",
      sport: sportCode,
      cta: "reset_filters",
    });
    setSearch("");
    setProvince("");
  };

  const requestCurrentLocation = useCallback(
    () =>
      new Promise<LocationState>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          reject,
          {
            enableHighAccuracy: false,
            maximumAge: 5 * 60 * 1000,
            timeout: 8000,
          },
        );
      }),
    [],
  );

  const handleRequestNearby = async () => {
    track("finder_filter_used", {
      surface: "court_finder",
      sport: sportCode,
      cta: "nearby",
    });
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setNearbyStatus(copy.nearbyUnsupported);
      return;
    }
    setLocatingNearby(true);
    setNearbyStatus(copy.nearbyFinding);
    try {
      const location = await requestCurrentLocation();
      setUserLocation(location);
      setPrioritizeNearby(true);
      setNearbyStatus(copy.nearbyActive);
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : null;
      if (errorCode === 1) {
        setNearbyStatus(copy.nearbyDenied);
      } else {
        setNearbyStatus(copy.nearbyUnsupported);
      }
    } finally {
      setLocatingNearby(false);
    }
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

  const courtsWithDistance = useMemo(() => {
    return courts.map((court) => {
      const courtLat = parseCoordinate(court.latitude);
      const courtLng = parseCoordinate(court.longitude);
      if (userLocation && courtLat !== null && courtLng !== null) {
        const distanceKm = haversineDistance(userLocation, {
          latitude: courtLat,
          longitude: courtLng,
        });
        return { court, distanceKm };
      }
      return { court, distanceKm: null };
    });
  }, [courts, userLocation]);

  const displayedCourts = useMemo(() => {
    if (prioritizeNearby && userLocation) {
      return [...courtsWithDistance].sort((a, b) => {
        const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDist - bDist;
      });
    }
    return courtsWithDistance;
  }, [courtsWithDistance, prioritizeNearby, userLocation]);

  const mapCourts = useMemo(
    () =>
      displayedCourts
        .map(({ court }) => {
          const lat = parseCoordinate(court.latitude);
          const lng = parseCoordinate(court.longitude);
          if (lat === null || lng === null) {
            return null;
          }
          return {
            id: court.id,
            name: court.name,
            latitude: lat,
            longitude: lng,
            href: buildCourtHref(court.id),
          };
        })
        .filter(
          (value): value is {
            id: string;
            name: string | null;
            latitude: number;
            longitude: number;
            href: string;
          } => value !== null,
        )
        .slice(0, 15),
    [buildCourtHref, displayedCourts],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.searchPlaceholder}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                track("finder_filter_used", {
                  surface: "court_finder",
                  sport: sportCode,
                  cta: "search",
                });
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="w-full md:w-64">
            <BaseSelect
              label={copy.provinceLabel}
              name="province"
              value={province}
              onChange={(event) => {
                setProvince(event.target.value);
                track("finder_filter_used", {
                  surface: "court_finder",
                  sport: sportCode,
                  cta: "province",
                });
              }}
              options={provinceOptions}
              variant="light"
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
              {copy.resetFilters}
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

      {prioritizeNearby && userLocation && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.mapHeading}
          </p>
          <div className="mt-4">
            {userLocation && mapCourts.length > 0 ? (
              <NearbyMap userLocation={userLocation} courts={mapCourts} />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500"
                style={{ aspectRatio: "4 / 3" }}
              >
                {copy.nearbyUnsupported}
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {displayedCourts
              .filter((entry) => entry.distanceKm !== null)
              .slice(0, 3)
              .map((entry) => (
                <div
                  key={`nearby-${entry.court.id}`}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <Link
                    href={buildCourtHref(entry.court.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <p className="font-semibold text-slate-900 group-hover:text-slate-700">
                      {entry.court.name ?? fallbackCourtName}
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-700">
                      {entry.distanceKm?.toFixed(2)} {distanceUnit}
                    </p>
                  </Link>
                  {entry.court.latitude && entry.court.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${entry.court.latitude},${entry.court.longitude}`}
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

      {courts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
          <Link
            href={buildLocalizedPath(
              `/courts/new?sport=${encodeURIComponent(sportCode)}`,
              locale,
            )}
            className="mt-5 inline-flex rounded-full bg-[var(--rt-primary)] px-4 py-2 text-xs font-semibold text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
            onClick={() =>
              track("empty_state_cta_click", {
                surface: "court_finder",
                sport: sportCode,
                cta: "add_court",
              })
            }
          >
            {copy.addCourtCta}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
            {displayedCourts.map(({ court, distanceKm }) => {
              const photo =
                court.court_photos?.find((p) => p.is_primary)?.image_url ??
                court.court_photos?.[0]?.image_url ??
                `/sports/${sportCode}.png`;
              const locationText = court.district ?? "";
              const distanceLabel =
                distanceKm !== null
                  ? `${copy.distanceLabel}: ${distanceKm.toFixed(1)} ${distanceUnit}`
                  : null;
              return (
                <CourtCard
                  key={court.id}
                  href={buildCourtHref(court.id)}
                  name={court.name ?? fallbackCourtName}
                  imageUrl={photo}
                  imageAlt={court.name ?? fallbackCourtImageAlt}
                  location={locationText}
                  primaryBadge={court.province || "TH"}
                  secondaryBadge={distanceLabel}
                />
              );
            })}
          </div>
          {hasMore && (
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
