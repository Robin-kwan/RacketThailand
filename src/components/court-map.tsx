"use client";

import { useMemo } from "react";

type CourtMapProps = {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
};

export function CourtMap({
  name,
  latitude,
  longitude,
  placeId,
}: CourtMapProps) {
  const normalizedPlaceId = placeId?.trim() || null;
  const mapUrl = useMemo(() => {
    const query = `${latitude},${longitude}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed&hl=en`;
  }, [latitude, longitude]);

  const mapsUrl = useMemo(() => {
    if (normalizedPlaceId) {
      const params = new URLSearchParams({
        api: "1",
        query: `${latitude},${longitude}`,
        query_place_id: normalizedPlaceId,
      });
      return `https://www.google.com/maps/search/?${params.toString()}`;
    }
    const fallbackParams = new URLSearchParams({
      api: "1",
      query: `${name} ${latitude},${longitude}`,
    });
    return `https://www.google.com/maps/search/?${fallbackParams.toString()}`;
  }, [latitude, longitude, name, normalizedPlaceId]);

  return (
    <section className="space-y-4 rounded-[32px] bg-white/90 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Map & Directions
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
        <p className="text-sm text-slate-600">
          View this court on the map and get directions instantly.
        </p>
      </header>
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-white/15" />
        <iframe
          title={`${name} location`}
          src={mapUrl}
          height="380"
          className="h-[380px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open in Google Maps
        </a>
      </div>
    </section>
  );
}
