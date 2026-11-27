"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, LocateFixed, Search } from "lucide-react";
import { track } from "@vercel/analytics";
import type { CourtProvinceOption, CourtRecord } from "@/server/courtFinder";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";
import { NearbyMap } from "@/components/nearby-map";
import { CourtCard } from "@/components/court-card";
import { courtPriceSummary } from "@/lib/court-price-summary";
import { TimePickerField } from "@/components/time-picker-field";
import {
  FinderFilterButton,
  FinderFilterChip,
  FinderFilterPanel,
  FinderSearchField,
  FinderRequestError,
} from "@/components/finder-filter-ui";

type CourtFinderCopy = {
  searchPlaceholder: string;
  provinceLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  timeClearLabel: string;
  allProvincesLabel: string;
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
  nearbyEmpty: string;
  distanceLabel: string;
  mapHeading: string;
  openMaps: string;
  addCourtCta: string;
  filtersLabel: string;
  moreFiltersTitle: string;
  applyFiltersLabel: string;
  closeFiltersLabel: string;
  removeFilterLabel: string;
  loadMoreLabel: string;
  loadingMoreLabel: string;
  noPhotoLabel: string;
  priceLabel: string;
  searchError: string;
  loadMoreError: string;
  retryLabel: string;
  loadingLabel: string;
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
  initialStartTime?: string;
  initialEndTime?: string;
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
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
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
  initialStartTime = "",
  initialEndTime = "",
}: CourtFinderProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const [province, setProvince] = useState<string>(initialProvince);
  const [startTimeFilter, setStartTimeFilter] = useState(initialStartTime);
  const [endTimeFilter, setEndTimeFilter] = useState(initialEndTime);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    search: initialSearch,
    province: initialProvince,
    startTime: initialStartTime,
    endTime: initialEndTime,
  });
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
  const lastLoadedRequestKeyRef = useRef<string | null>(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const [loadError, setLoadError] = useState<"search" | "more" | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const buildCourtHref = useCallback(
    (courtId: string) =>
      buildLocalizedPath(
        `/courts/${courtId}?sport=${encodeURIComponent(sportCode)}`,
        locale,
      ),
    [locale, sportCode],
  );
  const provinceOptions = useMemo(
    () => [{ value: "", label: copy.allProvincesLabel }, ...availableProvinces],
    [availableProvinces, copy.allProvincesLabel],
  );
  const fallbackCourtName =
    locale === "th" ? "ยังไม่ระบุชื่อสนาม" : "Unnamed court";
  const fallbackCourtImageAlt = locale === "th" ? "รูปสนาม" : "Court image";
  const countSummary =
    locale === "th"
      ? `${count.toLocaleString("th-TH")} สนาม`
      : `${count.toLocaleString("en-US")} courts`;
  const distanceUnit = locale === "th" ? "กม." : "km";
  const courtListRequestQuery = useMemo(() => {
    const params = new URLSearchParams({
      sport: sportCode,
      lang: locale,
      limit: PAGE_SIZE.toString(),
      page: "1",
    });
    if (appliedFilters.search) params.set("search", appliedFilters.search);
    if (appliedFilters.province)
      params.set("province", appliedFilters.province);
    if (appliedFilters.startTime)
      params.set("startTime", appliedFilters.startTime);
    if (appliedFilters.endTime) params.set("endTime", appliedFilters.endTime);
    if (prioritizeNearby && userLocation) {
      params.set("nearbyLat", String(userLocation.latitude));
      params.set("nearbyLng", String(userLocation.longitude));
      params.set("includeProvinces", "false");
    }
    return params.toString();
  }, [appliedFilters, locale, prioritizeNearby, sportCode, userLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (appliedFilters.search) {
      params.set("search", appliedFilters.search);
    } else {
      params.delete("search");
    }
    if (appliedFilters.province) {
      params.set("province", appliedFilters.province);
    } else {
      params.delete("province");
    }
    if (appliedFilters.startTime) {
      params.set("startTime", appliedFilters.startTime);
    } else {
      params.delete("startTime");
    }
    if (appliedFilters.endTime) {
      params.set("endTime", appliedFilters.endTime);
    } else {
      params.delete("endTime");
    }
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [appliedFilters, pathname]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const load = async () => {
      if (lastLoadedRequestKeyRef.current === null) {
        lastLoadedRequestKeyRef.current = courtListRequestQuery;
        return;
      }
      lastLoadedRequestKeyRef.current = courtListRequestQuery;
      loadMoreAbortRef.current?.abort();
      loadMoreAbortRef.current = null;
      setLoadingMore(false);
      setLoadError(null);
      setLoading(true);
      try {
        const response = await fetch(`/api/courts?${courtListRequestQuery}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!isActive) return;
        if (!response.ok || !Array.isArray(data?.courts)) throw new Error("Court search failed");
        const nextCourts = (data.courts ?? []) as CourtRecord[];
        const nextCount = Math.max(
          data.count ?? nextCourts.length,
          nextCourts.length,
        );
        setCourts(nextCourts);
        setCount(nextCount);
        setPage(1);
        setHasMore(nextCourts.length < nextCount);
        if (Array.isArray(data.provinces)) {
          setAvailableProvinces(data.provinces);
        }
      } catch {
        if (isActive && !controller.signal.aborted) setLoadError("search");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isActive = false;
      controller.abort();
      loadMoreAbortRef.current?.abort();
      loadMoreAbortRef.current = null;
    };
  }, [courtListRequestQuery, searchRevision]);

  const loadMoreCourts = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    setLoadError(null);
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        sport: sportCode,
        lang: locale,
        limit: PAGE_SIZE.toString(),
        page: nextPage.toString(),
        includeProvinces: "false",
      });
      if (appliedFilters.search) params.set("search", appliedFilters.search);
      if (appliedFilters.province)
        params.set("province", appliedFilters.province);
      if (appliedFilters.startTime)
        params.set("startTime", appliedFilters.startTime);
      if (appliedFilters.endTime) params.set("endTime", appliedFilters.endTime);
      if (prioritizeNearby && userLocation) {
        params.set("nearbyLat", String(userLocation.latitude));
        params.set("nearbyLng", String(userLocation.longitude));
      }
      const response = await fetch(`/api/courts?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok || !Array.isArray(data?.courts)) throw new Error("Court pagination failed");
      const nextCourts = (data.courts ?? []) as CourtRecord[];
      const nextCount = Math.max(data.count ?? count, nextCourts.length);
      setCount(nextCount);
      setPage(nextPage);
      setCourts((previous) => {
        const merged = new Map(previous.map((court) => [court.id, court]));
        nextCourts.forEach((court) => merged.set(court.id, court));
        const values = Array.from(merged.values());
        setHasMore(values.length < nextCount);
        return values;
      });
    } catch {
      if (!controller.signal.aborted) setLoadError("more");
    } finally {
      if (loadMoreAbortRef.current === controller) {
        loadMoreAbortRef.current = null;
        setLoadingMore(false);
      }
    }
  }, [
    count,
    appliedFilters,
    hasMore,
    loading,
    loadingMore,
    page,
    prioritizeNearby,
    sportCode,
    locale,
    userLocation,
  ]);

  const handleReset = () => {
    track("finder_filter_used", {
      surface: "court_finder",
      sport: sportCode,
      cta: "reset_filters",
    });
    setSearch("");
    setProvince("");
    setStartTimeFilter("");
    setEndTimeFilter("");
    setAppliedFilters({ search: "", province: "", startTime: "", endTime: "" });
    setUserLocation(null);
    setPrioritizeNearby(false);
    setNearbyStatus(null);
    setSearchRevision((current) => current + 1);
    setFiltersOpen(false);
  };

  const handleSearch = () => {
    track("finder_filter_used", {
      surface: "court_finder",
      sport: sportCode,
      cta: "search",
    });
    setAppliedFilters({
      search: search.trim(),
      province,
      startTime: startTimeFilter,
      endTime: endTimeFilter,
    });
    setSearchRevision((current) => current + 1);
    setPrioritizeNearby(false);
    setNearbyStatus(null);
    setFiltersOpen(false);
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
      setAppliedFilters({
        search: search.trim(),
        province,
        startTime: startTimeFilter,
        endTime: endTimeFilter,
      });
      setUserLocation(location);
      setPrioritizeNearby(true);
      setSearchRevision((current) => current + 1);
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
          (
            value,
          ): value is {
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
  const advancedFilterCount = Number(
    Boolean(appliedFilters.startTime || appliedFilters.endTime),
  );
  const hasActiveFilters =
    Object.values(appliedFilters).some(Boolean) || prioritizeNearby;
  const activeFilterChips = [
    appliedFilters.province
      ? {
          key: "province",
          label: `${copy.provinceLabel}: ${
            provinceOptions.find(
              (option) => option.value === appliedFilters.province,
            )?.label ?? appliedFilters.province
          }`,
        }
      : null,
    appliedFilters.startTime || appliedFilters.endTime
      ? {
          key: "time",
          label: `${copy.startTimeLabel}: ${appliedFilters.startTime || "--:--"}–${appliedFilters.endTime || "--:--"}`,
        }
      : null,
  ].filter((item): item is { key: string; label: string } => item !== null);

  const clearAppliedFilter = (key: string) => {
    const nextFilters = { ...appliedFilters };
    if (key === "time") {
      nextFilters.startTime = "";
      nextFilters.endTime = "";
      setStartTimeFilter("");
      setEndTimeFilter("");
    } else if (key === "province") {
      nextFilters.province = "";
      setProvince("");
    }
    setAppliedFilters(nextFilters);
    setSearchRevision((current) => current + 1);
    setPrioritizeNearby(false);
    setNearbyStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(20rem,1fr)_14rem_10rem_auto_auto] lg:items-center">
          <div className="col-span-2 lg:col-span-1">
            <FinderSearchField
              label={copy.searchPlaceholder}
              value={search}
              onChange={setSearch}
              onSubmit={handleSearch}
            />
          </div>
          <div className="min-w-0">
            <BaseSelect
              label={copy.provinceLabel}
              name="province"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              options={provinceOptions}
              variant="light"
              labelPlacement="inside"
              className="[&>div>button]:h-12 md:[&>div>button]:h-14"
            />
          </div>
          <FinderFilterButton
            label={copy.filtersLabel}
            open={filtersOpen}
            activeCount={advancedFilterCount}
            onClick={() => setFiltersOpen((current) => !current)}
          />
          <button
            type="button"
            onClick={handleRequestNearby}
            disabled={locatingNearby}
            className="rt-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:border disabled:border-slate-500 disabled:bg-slate-500 disabled:text-white disabled:transform-none md:h-14"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {locatingNearby ? copy.nearbyFinding : copy.nearbyButton}
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 md:h-14"
          >
            <Search className="h-4 w-4" aria-hidden />
            {locale === "th" ? "ค้นหา" : "Search"}
          </button>
        </div>

        <FinderFilterPanel
          open={filtersOpen}
          title={copy.moreFiltersTitle}
          closeLabel={copy.closeFiltersLabel}
          onClose={() => setFiltersOpen(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TimePickerField
              label={copy.startTimeLabel}
              value={startTimeFilter}
              placeholder="--:--"
              onChange={setStartTimeFilter}
              allowClear
              clearLabel={copy.timeClearLabel}
              className="min-w-0"
            />
            <TimePickerField
              label={copy.endTimeLabel}
              value={endTimeFilter}
              placeholder="--:--"
              onChange={setEndTimeFilter}
              allowClear
              clearLabel={copy.timeClearLabel}
              className="min-w-0"
            />
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
              >
                {copy.resetFilters}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {copy.applyFiltersLabel}
            </button>
          </div>
        </FinderFilterPanel>

        {activeFilterChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilterChips.map((filter) => (
              <FinderFilterChip
                key={filter.key}
                label={filter.label}
                removeLabel={copy.removeFilterLabel}
                onRemove={() => clearAppliedFilter(filter.key)}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500">
          <p className="inline-flex items-center gap-2">
            <span>{countSummary}</span>
            {loading ? (
              <span
                aria-label={
                  locale === "th" ? "กำลังอัปเดตข้อมูล" : "Updating data"
                }
                className="inline-block size-3 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
                role="status"
              />
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {prioritizeNearby && (
              <button
                type="button"
                onClick={handleClearNearby}
                className="text-slate-700 underline-offset-4 hover:underline"
              >
                {copy.nearbyClear}
              </button>
            )}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-700 underline-offset-4 hover:underline"
              >
                {copy.resetFilters}
              </button>
            ) : null}
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

      {loadError === "search" && !loading && (
        <FinderRequestError
          message={copy.searchError}
          retryLabel={copy.retryLabel}
          onRetry={() => setSearchRevision((current) => current + 1)}
        />
      )}

      {prioritizeNearby && userLocation && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.mapHeading}
          </p>
          <div className="mt-4">
            {userLocation && mapCourts.length > 0 ? (
              <NearbyMap userLocation={userLocation} courts={mapCourts} />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500"
                style={{ aspectRatio: "4 / 3" }}
              >
                {copy.nearbyEmpty}
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
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <Link
                    href={buildCourtHref(entry.court.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-w-0 flex-1"
                  >
                    <p className="break-words font-semibold text-slate-900 group-hover:text-slate-700">
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
                      className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {copy.openMaps}
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {loading && courts.length === 0 ? (
        <p role="status" className="py-12 text-center text-sm text-slate-600">{copy.loadingLabel}</p>
      ) : courts.length === 0 && loadError !== "search" ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {hasActiveFilters && (
              <button type="button" onClick={handleReset} className="rt-btn-primary min-h-11 px-4 py-2 text-sm">
                {copy.resetFilters}
              </button>
            )}
            <Link
              href={buildLocalizedPath(
                `/courts/new?sport=${encodeURIComponent(sportCode)}`,
                locale,
              )}
              className="rt-btn-court inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm"
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
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
            {displayedCourts.map(({ court, distanceKm }) => {
              const photo =
                court.court_photos?.find((p) => p.is_primary)?.image_url ??
                court.court_photos?.[0]?.image_url;
              const locationText = court.district ?? "";
              const priceSummary = courtPriceSummary(court.price_note);
              const distanceLabel =
                distanceKm !== null
                  ? `${copy.distanceLabel}: ${distanceKm.toFixed(1)} ${distanceUnit}`
                  : null;
              return (
                <CourtCard
                  key={court.id}
                  href={buildCourtHref(court.id)}
                  name={court.name ?? fallbackCourtName}
                  imageUrl={photo ?? `/sports/${sportCode}.png`}
                  imageAlt={court.name ?? fallbackCourtImageAlt}
                  imagePlaceholderLabel={photo ? undefined : copy.noPhotoLabel}
                  imageAspectClass="aspect-[8/5]"
                  location={locationText}
                  details={priceSummary ? [`${copy.priceLabel}: ${priceSummary}`] : []}
                  primaryBadge={court.province || "TH"}
                  secondaryBadge={distanceLabel}
                />
              );
            })}
          </div>
          {loadError === "more" && (
            <FinderRequestError message={copy.loadMoreError} retryLabel={copy.retryLabel} onRetry={() => void loadMoreCourts()} />
          )}
          {hasMore && !loading && !loadError && (
            <div className="flex min-h-20 items-center justify-center pt-4">
              <button
                type="button"
                onClick={() => void loadMoreCourts()}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="rt-btn-primary inline-flex min-w-40 items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:cursor-wait disabled:opacity-70"
              >
                {loadingMore ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                )}
                {loadingMore ? copy.loadingMoreLabel : copy.loadMoreLabel}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
