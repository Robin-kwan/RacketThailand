"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapCoordinates } from "@/lib/google-maps";
import type { PlaceDetailsPayload } from "@/lib/google-places";

export type PlaceResolution = {
  coordinates: MapCoordinates;
  place?: PlaceDetailsPayload | null;
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
  currentCoordinates?: MapCoordinates | null;
};

const SEARCH_DELAY = 250;

export function PlaceSearchField({
  label,
  helper,
  noResults,
  placeholder = "Search for a venue, mall, or court",
  onResolve,
  currentCoordinates,
}: PlaceSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
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
          setStatus(
            data.predictions.length === 0 ? noResults : "Select a result.",
          );
        } else {
          setSuggestions([]);
          setOpen(false);
          setStatus(
            data?.error ?? "Unable to search Google Maps right now.",
          );
        }
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setOpen(false);
        setStatus("Unable to search Google Maps right now.");
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
    setStatus("Importing details from Google Maps…");
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
        onResolve(data);
        setStatus("Location imported from Google Maps.");
      } else {
        setStatus(
          data?.error ?? "Unable to import place details. Try another search.",
        );
      }
    } catch {
      setStatus("Unable to import place details. Try another search.");
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
            <svg
              className="h-4 w-4 animate-spin text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
              />
            </svg>
          </div>
        )}
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
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
      {status && <p className="text-xs text-slate-500">{status}</p>}
      {currentCoordinates?.latitude && currentCoordinates?.longitude && (
        <p className="text-xs text-slate-400">
          Current coordinates: {currentCoordinates.latitude},{" "}
          {currentCoordinates.longitude}
        </p>
      )}
      <p className="text-xs text-slate-400">{helper}</p>
    </div>
  );
}
