"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { MapCoordinates } from "@/lib/google-maps";
import type { PlaceDetailsPayload } from "@/lib/google-places";

export type PlaceResolution = {
  coordinates: MapCoordinates;
  place?: PlaceDetailsPayload | null;
  placeId?: string;
};

type Suggestion = {
  description: string;
  placeId: string;
  secondary?: string;
};

type PlaceSearchFieldProps = {
  label: string;
  helper: string;
  noResults: string;
  onResolve: (resolution: PlaceResolution) => void;
  placeholder?: string;
  initialQuery?: string;
  selectedCoordinates?: MapCoordinates | null;
};

const SEARCH_DELAY = 300;

export function PlaceSearchField({
  label,
  helper,
  noResults,
  placeholder = "Search for a venue, mall, or court",
  onResolve,
  initialQuery,
  selectedCoordinates,
}: PlaceSearchFieldProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const sessionToken = useMemo(
    () =>
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)),
    [],
  );
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mapCoordinates, setMapCoordinates] = useState<MapCoordinates | null>(
    selectedCoordinates ?? null,
  );

  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  useEffect(() => {
    if (
      selectedCoordinates &&
      typeof selectedCoordinates.latitude === "number" &&
      typeof selectedCoordinates.longitude === "number"
    ) {
      setMapCoordinates({
        latitude: selectedCoordinates.latitude,
        longitude: selectedCoordinates.longitude,
      });
    } else if (!selectedCoordinates) {
      setMapCoordinates(null);
    }
  }, [selectedCoordinates]);

  useEffect(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({
        input: query.trim(),
        sessiontoken: sessionToken,
      });
      try {
        const response = await fetch(`/api/places/autocomplete?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (response.ok && data?.predictions) {
          setSuggestions(data.predictions);
          setOpen(data.predictions.length > 0);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DELAY);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, sessionToken, noResults]);

  const handleSelect = async (suggestion: Suggestion) => {
    setOpen(false);
    setResolving(true);
    setQuery(suggestion.description);
    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.coordinates) {
        setMapCoordinates(data.coordinates);
        onResolve({
          coordinates: data.coordinates,
          place: data.place,
          placeId: data.placeId ?? suggestion.placeId,
        });
      } 
    } catch {
    } finally {
      setResolving(false);
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
        />
        {(searching || resolving) && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <LoaderCircle
              className="h-4 w-4 animate-spin text-slate-400"
              strokeWidth={1.8}
              aria-hidden
            />
          </div>
        )}
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(suggestion);
                }}
                className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-none hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-800">
                  {suggestion.description}
                </span>
                {suggestion.secondary && (
                  <span className="text-xs text-slate-500">
                    {suggestion.secondary}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">{helper}</p>
      {mapCoordinates && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Location preview
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
            <iframe
              title="Selected location map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${mapCoordinates.latitude},${mapCoordinates.longitude}`)}&z=15&output=embed&hl=en`}
              className="h-64 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </div>
  );
}
