"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Repeat2 } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { BaseAutocomplete } from "@/components/base-autocomplete";
import { DatePickerField } from "@/components/date-picker-field";
import { BaseTextField } from "@/components/base-text-field";
import { BaseTextArea } from "@/components/base-text-area";
import {
  PlaceSearchField,
  type ExistingCourt,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import { showToast } from "@/components/toaster";
import {
  ClosingTimePickerField,
  TimePickerField,
  createClosingTimeOptions,
  createTimeOptions,
} from "@/components/time-picker-field";
import type { Locale } from "@/lib/i18n";
import type { MapCoordinates } from "@/lib/google-maps";
import type { PlaceDetailsPayload } from "@/lib/google-places";

type Option = {
  value: string;
  label: string;
};

type SessionMode = "weekly" | "date";

export type GroupSessionFormCopy = {
  title: string;
  description: string;
  weeklyMode: string;
  dateMode: string;
  courtLabel: string;
  courtPlaceholder: string;
  dayLabel: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  required: string;
  dateRangeError: string;
  courtSportMismatch: string;
  noCourts: string;
  clearTime: string;
  quickCourtAddOption: string;
  quickCourtTitle: string;
  quickCourtName: string;
  quickCourtNamePlaceholder: string;
  quickCourtPlaceSearch: string;
  quickCourtPlaceHelper: string;
  quickCourtNoResults: string;
  quickCourtDuplicateLabel: string;
  quickCourtDuplicateLinkLabel: string;
  quickCourtLocationPreview: string;
  quickCourtMapTitle: string;
  quickCourtSave: string;
  quickCourtSaving: string;
  quickCourtCancel: string;
  quickCourtNameRequired: string;
  quickCourtPlaceRequired: string;
  quickCourtDuplicateError: string;
  quickCourtLocationIncomplete: string;
  quickCourtCreateError: string;
};

type GroupSessionFormProps = {
  groupId: string;
  sportId: string;
  locale: Locale;
  dayOptions: Option[];
  copy: GroupSessionFormCopy;
};

const TIME_OPTIONS = createTimeOptions({ minuteStep: 30 });
const CLOSING_TIME_OPTIONS = createClosingTimeOptions({ minuteStep: 30 });
const QUICK_ADD_COURT_VALUE = "__quick_add_court__";

type QuickCourtDraft = {
  name: string;
  place: PlaceDetailsPayload | null;
  placeId: string;
  coordinates: MapCoordinates | null;
  duplicateCourt: ExistingCourt | null;
  validationVisible: boolean;
  submitting: boolean;
  error: string | null;
};

const createQuickCourtDraft = (): QuickCourtDraft => ({
  name: "",
  place: null,
  placeId: "",
  coordinates: null,
  duplicateCourt: null,
  validationVisible: false,
  submitting: false,
  error: null,
});

function getThailandDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-");
}

export function GroupSessionForm({
  groupId,
  sportId,
  locale,
  dayOptions,
  copy,
}: GroupSessionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<SessionMode>("weekly");
  const [courtOptions, setCourtOptions] = useState<Option[]>([]);
  const [courtId, setCourtId] = useState("");
  const [day, setDay] = useState(dayOptions[0]?.value ?? "sunday");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("00:00");
  const [notes, setNotes] = useState("");
  const [validationVisible, setValidationVisible] = useState(false);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [quickCourt, setQuickCourt] = useState<QuickCourtDraft | null>(null);

  const today = useMemo(() => getThailandDate(0), []);
  const maxDate = useMemo(() => getThailandDate(30), []);
  const courtSelectOptions = useMemo(
    () => [
      { value: QUICK_ADD_COURT_VALUE, label: copy.quickCourtAddOption },
      ...courtOptions,
    ],
    [copy.quickCourtAddOption, courtOptions],
  );
  const weeklyInvalid = mode === "weekly" && !courtId;
  const dateInvalid =
    mode === "date" &&
    (!courtId || !date || !start || date < today || date > maxDate);
  const isInvalid = weeklyInvalid || dateInvalid;

  useEffect(() => {
    let active = true;
    const loadCourts = async () => {
      setLoadingCourts(true);
      try {
        const response = await fetch(
          `/api/court-options?sportId=${encodeURIComponent(
            sportId,
          )}&lang=${encodeURIComponent(locale)}`,
        );
        const data = await response.json().catch(() => null);
        if (!active) return;
        setCourtOptions(response.ok && Array.isArray(data?.options)
          ? data.options
          : []);
      } catch {
        if (active) {
          setCourtOptions([]);
        }
      } finally {
        if (active) {
          setLoadingCourts(false);
        }
      }
    };

    if (sportId) {
      loadCourts();
    }

    return () => {
      active = false;
    };
  }, [locale, sportId]);

  const resetAfterSubmit = () => {
    setMode("weekly");
    setCourtId("");
    setDay(dayOptions[0]?.value ?? "sunday");
    setDate("");
    setStart("00:00");
    setEnd("00:00");
    setNotes("");
    setValidationVisible(false);
  };

  const handleCourtChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCourtId = event.target.value;
    if (nextCourtId === QUICK_ADD_COURT_VALUE) {
      setQuickCourt(createQuickCourtDraft());
      return;
    }
    setCourtId(nextCourtId);
    setQuickCourt(null);
  };

  const handleQuickCourtPlaceResolution = (resolution: PlaceResolution) => {
    setQuickCourt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        place: resolution.place ?? null,
        placeId: resolution.place?.placeId ?? resolution.placeId ?? "",
        coordinates: resolution.coordinates,
        duplicateCourt: null,
        name: prev.name.trim() ? prev.name : resolution.place?.name ?? prev.name,
        error: null,
      };
    });
  };

  const handleQuickCourtSubmit = async () => {
    if (!quickCourt) return;
    setQuickCourt((prev) =>
      prev
        ? {
            ...prev,
            validationVisible: true,
            error: null,
          }
        : prev,
    );

    const name = quickCourt.name.trim();
    const place = quickCourt.place;
    const coordinates = quickCourt.coordinates;
    const latitude = Number(coordinates?.latitude);
    const longitude = Number(coordinates?.longitude);
    const hasCompleteLocation =
      Boolean(place?.address) &&
      Boolean(place?.province) &&
      typeof place?.provinceId === "number" &&
      typeof place?.districtId === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    if (
      !name ||
      !quickCourt.placeId ||
      !place ||
      !coordinates ||
      quickCourt.duplicateCourt ||
      !hasCompleteLocation
    ) {
      return;
    }

    setQuickCourt((prev) =>
      prev
        ? {
            ...prev,
            submitting: true,
            error: null,
          }
        : prev,
    );

    try {
      const response = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId,
          name,
          address: place.address,
          district: place.district ?? "",
          province: place.province,
          provinceId: place.provinceId,
          districtId: place.districtId,
          latitude,
          longitude,
          googlePlaceId: quickCourt.placeId,
          phone: place.phone ?? "",
          website_url: place.website ?? "",
          opening_hours: place.openingHoursStructured ?? null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.courtId) {
        setQuickCourt((prev) =>
          prev
            ? {
                ...prev,
                submitting: false,
                error: data?.error ?? copy.quickCourtCreateError,
              }
            : prev,
        );
        return;
      }

      const nextCourtId = data.courtId as string;
      const label = [name, place.province].filter(Boolean).join(" - ");
      setCourtOptions((prev) => [
        { value: nextCourtId, label },
        ...prev.filter((option) => option.value !== nextCourtId),
      ]);
      setCourtId(nextCourtId);
      setQuickCourt(null);
      setValidationVisible(false);
    } catch {
      setQuickCourt((prev) =>
        prev
          ? {
              ...prev,
              submitting: false,
              error: copy.quickCourtCreateError,
            }
          : prev,
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationVisible(true);

    if (isInvalid) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          courtId,
          day,
          date,
          start,
          end,
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitting(false);
        showToast({
          variant: "error",
          message:
            data?.code === "DATE_OUT_OF_RANGE"
              ? copy.dateRangeError
              : data?.code === "INVALID_COURT_SPORT"
                ? copy.courtSportMismatch
                : data?.error ?? copy.error,
        });
        return;
      }

      setSubmitting(false);
      showToast({ variant: "success", message: copy.success });
      resetAfterSubmit();
      startTransition(() => router.refresh());
    } catch {
      setSubmitting(false);
      showToast({
        variant: "error",
        message: copy.error,
      });
    }
  };

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.description}
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["weekly", copy.weeklyMode, Repeat2],
              ["date", copy.dateMode, CalendarDays],
            ] as const
          ).map(([value, label, Icon]) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setValidationVisible(false);
                }}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "border-[rgb(var(--rt-primary-border-rgb))] bg-[rgb(var(--rt-primary-rgb)/0.1)] text-[var(--foreground)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    active
                      ? "bg-[rgb(var(--rt-primary-rgb))] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {label}
              </button>
            );
          })}
        </div>

        <BaseAutocomplete
          label={copy.courtLabel}
          name="sessionCourt"
          value={courtId}
          onChange={handleCourtChange}
          options={courtSelectOptions}
          placeholder={copy.courtPlaceholder}
          helperText={
            loadingCourts
              ? `${copy.courtPlaceholder}...`
              : courtOptions.length === 0
                ? copy.noCourts
                : undefined
          }
          noResultsText={copy.noCourts}
          pinnedOptionValues={[QUICK_ADD_COURT_VALUE]}
          variant="light"
          className={
            validationVisible && weeklyInvalid
              ? "[&_input[type='text']]:border-rose-300 [&_input[type='text']]:bg-rose-50"
              : undefined
          }
        />
        {quickCourt && (
          <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                {copy.quickCourtTitle}
              </p>
              <button
                type="button"
                onClick={() => setQuickCourt(null)}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                {copy.quickCourtCancel}
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {copy.quickCourtName}
              </label>
              <BaseTextField
                type="text"
                value={quickCourt.name}
                onChange={(event) =>
                  setQuickCourt((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: event.target.value,
                          error: null,
                        }
                      : prev,
                  )
                }
                placeholder={copy.quickCourtNamePlaceholder}
                variant="light"
                aria-invalid={
                  quickCourt.validationVisible && !quickCourt.name.trim()
                }
                className={
                  quickCourt.validationVisible && !quickCourt.name.trim()
                    ? "border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                    : undefined
                }
              />
              {quickCourt.validationVisible && !quickCourt.name.trim() && (
                <p className="text-xs font-medium text-rose-600">
                  {copy.quickCourtNameRequired}
                </p>
              )}
            </div>
            <PlaceSearchField
              label={copy.quickCourtPlaceSearch}
              placeholder={copy.quickCourtPlaceSearch}
              helper={copy.quickCourtPlaceHelper}
              noResults={copy.quickCourtNoResults}
              duplicateLabel={copy.quickCourtDuplicateLabel}
              duplicateLinkLabel={copy.quickCourtDuplicateLinkLabel}
              locationPreviewLabel={copy.quickCourtLocationPreview}
              mapTitle={copy.quickCourtMapTitle}
              onResolve={handleQuickCourtPlaceResolution}
              onDuplicateCourtChange={(court) =>
                setQuickCourt((prev) =>
                  prev
                    ? {
                        ...prev,
                        duplicateCourt: court,
                        error: null,
                      }
                    : prev,
                )
              }
              invalid={
                quickCourt.validationVisible &&
                (!quickCourt.placeId ||
                  !quickCourt.coordinates ||
                  !quickCourt.place ||
                  Boolean(quickCourt.duplicateCourt) ||
                  !quickCourt.place.address ||
                  !quickCourt.place.province ||
                  typeof quickCourt.place.provinceId !== "number" ||
                  typeof quickCourt.place.districtId !== "number")
              }
              invalidMessage={
                quickCourt.duplicateCourt
                  ? copy.quickCourtDuplicateError
                  : !quickCourt.placeId || !quickCourt.coordinates
                    ? copy.quickCourtPlaceRequired
                    : copy.quickCourtLocationIncomplete
              }
            />
            {quickCourt.error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
                {quickCourt.error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleQuickCourtSubmit}
                disabled={quickCourt.submitting}
                className="rt-btn-court inline-flex items-center justify-center px-5 py-2 text-sm disabled:cursor-not-allowed"
              >
                {quickCourt.submitting
                  ? `${copy.quickCourtSaving}...`
                  : copy.quickCourtSave}
              </button>
              <button
                type="button"
                onClick={() => setQuickCourt(null)}
                disabled={quickCourt.submitting}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {copy.quickCourtCancel}
              </button>
            </div>
          </div>
        )}

        {mode === "date" && (
          <div className="grid gap-4">
            <DatePickerField
              label={copy.dateLabel}
              value={date}
              onChange={setDate}
              locale={locale}
              min={today}
              max={maxDate}
              required
              inputClassName={
                validationVisible &&
                (!date || date < today || date > maxDate)
                  ? "cursor-pointer border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                  : "cursor-pointer"
              }
            />
          </div>
        )}

        {mode === "weekly" && (
          <BaseSelect
            label={copy.dayLabel}
            name="sessionDay"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            options={dayOptions}
            required
            variant="light"
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TimePickerField
            label={copy.startLabel}
            value={start}
            options={TIME_OPTIONS}
            onChange={setStart}
          />
          <ClosingTimePickerField
            label={copy.endLabel}
            value={end}
            options={CLOSING_TIME_OPTIONS}
            startTime={start}
            allowOvernight
            allowClear={mode === "date"}
            clearLabel={copy.clearTime}
            onChange={setEnd}
          />
        </div>

        {mode === "date" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.notesLabel}
            </label>
            <BaseTextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={copy.notesPlaceholder}
              rows={2}
              variant="light"
            />
          </div>
        )}

        {validationVisible && isInvalid && (
          <p className="text-sm font-medium text-rose-600">
            {date && (date < today || date > maxDate)
              ? copy.dateRangeError
              : copy.required}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || isPending}
          className="rt-btn-group inline-flex w-full items-center justify-center px-6 py-3 text-sm sm:w-auto"
        >
          {submitting || isPending ? `${copy.submitting}...` : copy.submit}
        </button>
      </form>
    </section>
  );
}
