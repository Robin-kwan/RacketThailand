"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CourtRecord } from "@/server/courtFinder";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";
import { NearbyMap } from "@/components/nearby-map";
import { useDebounce } from "@/hooks/use-debounce";

type CourtFinderCopy = {
  searchPlaceholder: string;
  provinceLabel: string;
  resetFilters: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  lastUpdated: string;
  nearbyButton: string;
  nearbyFinding: string;
  nearbyClear: string;
  nearbyUnsupported: string;
  nearbyDenied: string;
  nearbyActive: string;
  distanceLabel: string;
  mapHeading: string;
  openMaps: string;
};

type CourtFinderProps = {
  sportCode: string;
  locale: Locale;
  accent: string;
  copy: CourtFinderCopy;
  initialCourts: CourtRecord[];
  provinces: string[];
  total: number;
};

const PAGE_SIZE = 12;

const stripHtml = (input?: string | null) =>
  input ? input.replace(/<[^>]+>/g, "").trim() : "";

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
  accent,
  copy,
  initialCourts,
  provinces,
  total,
}: CourtFinderProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [province, setProvince] = useState<string>("");
  const [courts, setCourts] = useState(initialCourts);
  const [availableProvinces, setAvailableProvinces] = useState(provinces);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(total);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);
  const localeQuery =
    locale === DEFAULT_LOCALE ? "" : `?lang=${locale}`;
  const provinceOptions = useMemo(
    () => [
      { value: "", label: copy.resetFilters },
      ...availableProvinces.map((prov) => ({
        value: prov,
        label: prov,
      })),
    ],
    [availableProvinces, copy.resetFilters],
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
      if (province) params.set("province", province);
      const response = await fetch(`/api/courts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      setCourts(data.courts ?? []);
      setCount(data.count ?? 0);
      setAvailableProvinces(data.provinces ?? []);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [sportCode, debouncedSearch, province]);

  const handleReset = () => {
    setSearch("");
    setProvince("");
  };

  const handleRequestNearby = () => {
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
            href: `/courts/${court.id}${localeQuery}`,
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
    [displayedCourts, localeQuery],
  );

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
            <BaseSelect
              label={copy.provinceLabel}
              name="province"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              options={provinceOptions}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            {count.toLocaleString("en-US")} courts ·{" "}
            {loading ? "loading..." : "live data"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestNearby}
              disabled={locatingNearby}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className="mt-2 text-sm text-slate-500">{nearbyStatus}</p>
        )}
      </div>

      {prioritizeNearby && userLocation && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
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
                    href={`/courts/${entry.court.id}${localeQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <p className="font-semibold text-slate-900 group-hover:text-slate-700">
                      {entry.court.name ?? "Unnamed court"}
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-700">
                      {entry.distanceKm?.toFixed(2)} km
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
            href={buildLocalizedPath("/", locale)}
            className="mt-6 inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            {copy.backLink}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayedCourts.map(({ court, distanceKm }) => (
            <Link
              key={court.id}
              href={`/courts/${court.id}${localeQuery}`}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-md shadow-slate-200 transition hover:-translate-y-1"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                <div className="relative h-36 w-full">
                  <Image
                    src={
                      court.court_photos?.find((p) => p.is_primary)?.image_url ??
                      court.court_photos?.[0]?.image_url ??
                      "/sports/badminton.svg"
                    }
                    alt={court.name ?? "Court image"}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold text-slate-900">
                  {court.name ?? "Unnamed court"}
                </h3>
                <p className="text-sm text-slate-600">
                  {[court.district, court.province].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  court.address,
                  court.price_note
                    ? `฿ ${stripHtml(court.price_note)}`
                    : null,
                  court.phone ? `Tel: ${court.phone}` : null,
                  court.line_id ? `Line: ${court.line_id}` : null,
                ]
                  .filter(Boolean)
                  .map((detail) => (
                    <li key={`${court.id}-${detail}`}>{detail}</li>
                  ))}
                {court.created_at && (
                  <li className="text-xs text-slate-400">
                    {copy.lastUpdated}{" "}
                    {new Date(court.created_at).toLocaleDateString("en-US")}
                  </li>
                )}
              </ul>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                <span
                  className="inline-flex rounded-full px-3 py-1"
                  style={{ backgroundColor: `${accent}15`, color: accent }}
                >
                  {court.province || "TH"}
                </span>
                {distanceKm !== null && (
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 normal-case tracking-normal">
                    {copy.distanceLabel}: {distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
