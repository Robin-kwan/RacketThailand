"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { buildLocalizedPath, normalizeLocale, type Locale } from "@/lib/i18n";
import thMessages from "@/messages/th.json";
import enMessages from "@/messages/en.json";
import { BaseTextField } from "@/components/base-text-field";
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

export type ExistingCourt = {
  id: string;
  name: string | null;
  district?: string | null;
  province?: string | null;
  is_active?: boolean | null;
};

type PlaceSearchFieldProps = {
  label: string;
  helper: string;
  noResults: string;
  duplicateLabel?: string;
  duplicateLinkLabel?: string;
  onResolve: (resolution: PlaceResolution) => void;
  onDuplicateCourtChange?: (court: ExistingCourt | null) => void;
  onSelectionClear?: () => void;
  locale?: Locale;
  placeholder?: string;
  initialQuery?: string;
  selectedCoordinates?: MapCoordinates | null;
  currentCourtId?: string;
  invalid?: boolean;
  invalidMessage?: string;
  locationPreviewLabel?: string;
  mapTitle?: string;
};

const SEARCH_DELAY = 750;
const MIN_SEARCH_LENGTH = 3;
const isLinkQuery = (value: string) =>
  /^(?:https?:\/\/|(?:www\.|maps\.)?google\.|maps\.app\.goo\.gl|goo\.gl\/|share\.google\/)/i.test(
    value.trim(),
  );

export function PlaceSearchField({
  label,
  helper,
  noResults,
  onSelectionClear,
  locale: suppliedLocale,
  duplicateLabel = "This place is already registered as",
  duplicateLinkLabel = "existing court",
  placeholder = "Search for a venue, mall, or court",
  onResolve,
  onDuplicateCourtChange,
  initialQuery,
  selectedCoordinates,
  currentCourtId,
  invalid = false,
  invalidMessage,
  locationPreviewLabel = "Location preview",
  mapTitle = "Selected location map",
}: PlaceSearchFieldProps) {
  const inputId = useId();
  const [locale, setLocale] = useState<Locale>(suppliedLocale ?? "th");
  const copy = (locale === "en" ? enMessages : thMessages).placeSearch;
  const [mode, setMode] = useState<"auto" | "manual" | "selected">("selected");
  const [error, setError] = useState<keyof typeof copy | null>(null);
  const [searched, setSearched] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const selectionRef = useRef(0);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [existingCourt, setExistingCourt] = useState<ExistingCourt | null>(
    null,
  );
  const sessionToken = useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    [],
  );
  const [mapCoordinates, setMapCoordinates] = useState<MapCoordinates | null>(
    selectedCoordinates ?? null,
  );

  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);
  useEffect(() => {
    setLocale(suppliedLocale ?? normalizeLocale(document.documentElement.lang));
  }, [suppliedLocale]);
  useEffect(
    () => () => {
      requestRef.current?.abort();
      selectionRef.current++;
    },
    [],
  );

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
    const trimmedQuery = query.trim();
    if (mode !== "auto" || isLinkQuery(query)) return;
    if (!trimmedQuery || trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const handle = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({
        input: trimmedQuery,
        sessiontoken: sessionToken,
      });
      try {
        const response = await fetch(`/api/places/autocomplete?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (response.ok && data?.predictions && !data.error) {
          setSuggestions(data.predictions);
          setOpen(true);
          setSearched(true);
        } else {
          setSuggestions([]);
          setOpen(false);
          setError("failed");
        }
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setOpen(false);
        setError("failed");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DELAY);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, sessionToken, mode]);

  const clearSelection = () => {
    setMapCoordinates(null);
    setExistingCourt(null);
    onSelectionClear?.();
    onDuplicateCourtChange?.(null);
  };

  const searchMore = async () => {
    requestRef.current?.abort();
    setMode("manual");
    setError(null);
    setSuggestions([]);
    setSearched(false);
    setSearching(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const params = new URLSearchParams({
        input: query.trim(),
        mode: isLinkQuery(query) ? "link" : "text",
      });
      const response = await fetch(`/api/places/search?${params}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || data.error) {
        setError(
          ["invalidLink", "unresolvedLink", "signInRequired"].includes(
            data.error,
          )
            ? data.error
            : "failed",
        );
        return;
      }
      setSuggestions(data.predictions ?? []);
      setSearched(true);
      setOpen(true);
    } catch {
      if (!controller.signal.aborted) setError("failed");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  const handleSelect = async (suggestion: Suggestion) => {
    requestRef.current?.abort();
    const selection = ++selectionRef.current;
    const token = mode === "auto" ? sessionToken : undefined;
    setMode("selected");
    setSearching(false);
    setError(null);
    clearSelection();
    setOpen(false);
    setResolving(true);
    setQuery(suggestion.description);
    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: token,
        }),
      });
      const data = await response.json().catch(() => null);
      if (selection !== selectionRef.current) return;
      if (response.ok && data?.coordinates && data.place) {
        const resolvedPlaceId = data.placeId ?? suggestion.placeId;
        const params = new URLSearchParams({ placeId: resolvedPlaceId });
        if (currentCourtId) {
          params.set("excludeCourtId", currentCourtId);
        }
        const lookupResponse = await fetch(`/api/courts/by-place?${params}`, {
          cache: "no-store",
        });
        const lookupData = await lookupResponse.json().catch(() => null);
        if (selection !== selectionRef.current) return;
        if (!lookupResponse.ok || !lookupData)
          throw new Error("Duplicate check failed");
        const duplicate =
          lookupResponse.ok && lookupData?.court ? lookupData.court : null;
        setExistingCourt(duplicate);
        setMapCoordinates(data.coordinates);
        onResolve({
          coordinates: data.coordinates,
          place: data.place,
          placeId: resolvedPlaceId,
        });
        onDuplicateCourtChange?.(duplicate);
      } else {
        throw new Error("Details lookup failed");
      }
    } catch {
      if (selection === selectionRef.current) setError("detailsFailed");
    } finally {
      if (selection === selectionRef.current) setResolving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <BaseTextField
          id={inputId}
          disabled={resolving}
          type="text"
          value={query}
          onChange={(event) => {
            requestRef.current?.abort();
            selectionRef.current++;
            setQuery(event.target.value);
            setMode("auto");
            setSearching(false);
            setSuggestions([]);
            setOpen(false);
            setSearched(false);
            setError(null);
            clearSelection();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              event.stopPropagation();
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (query.trim().length >= 3 && !searching && !resolving)
                void searchMore();
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          aria-invalid={invalid}
          data-invalid={invalid ? "true" : undefined}
          variant="light"
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
          <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => void handleSelect(suggestion)}
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
      <p className="text-xs text-slate-500">{copy.hint}</p>
      {query.trim().length >= 3 && mode !== "selected" && (
        <button
          type="button"
          onClick={() => void searchMore()}
          disabled={searching || resolving}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isLinkQuery(query) ? copy.lookupLink : copy.more}
        </button>
      )}
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {copy[error]}
          </p>
        )}
        {!error &&
          searched &&
          !searching &&
          !suggestions.length &&
          mode !== "selected" && (
            <p className="text-sm text-slate-600">
              {noResults} — {copy.empty}
            </p>
          )}
      </div>
      <p
        className={`text-xs ${invalid ? "font-medium text-rose-600" : "text-slate-400"}`}
      >
        {invalid ? (invalidMessage ?? helper) : helper}
      </p>
      {existingCourt && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {duplicateLabel}{" "}
          <Link
            href={buildLocalizedPath(
              `/courts/${existingCourt.id}`,
              typeof window === "undefined"
                ? "th"
                : normalizeLocale(
                    new URLSearchParams(window.location.search).get("lang"),
                  ),
            )}
            className="font-semibold underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            {existingCourt.name ?? duplicateLinkLabel}
          </Link>
        </p>
      )}
      {mapCoordinates && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {locationPreviewLabel}
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
            <iframe
              title={mapTitle}
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
