"use client";

import { ReactNode } from "react";
import {
  ChevronDown,
  Landmark,
  LockKeyhole,
  MapPinned,
  MapPinPlusInside,
  ScanSearch,
} from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { BaseTextField } from "@/components/base-text-field";
import { BaseTextArea } from "@/components/base-text-area";

type SportOption = {
  id: string;
  label: string;
};

export type CourtFormValues = {
  sportId: string;
  sportIds: string[];
  name: string;
  description: string;
  address: string;
  district: string;
  province: string;
  districtId: string;
  provinceId: string;
  price_note: string;
  phone: string;
  line_id: string;
  website_url: string;
  latitude: string;
  longitude: string;
  googlePlaceId: string;
};

export type CourtFormCopy = {
  selectSport: string;
  name: string;
  description: string;
  address: string;
  district: string;
  province: string;
  locationDetailsTitle: string;
  locationDetailsHelper: string;
  locationDetailsEmpty: string;
  locationLockedBadge: string;
  price: string;
  openingHours: string;
  phone: string;
  line: string;
  lineQr: string;
  website: string;
};

type LocationDetailsCardProps = {
  values: CourtFormValues;
  copy: Pick<
    CourtFormCopy,
    | "address"
    | "district"
    | "province"
    | "locationDetailsTitle"
    | "locationDetailsHelper"
    | "locationDetailsEmpty"
    | "locationLockedBadge"
  >;
};

type CourtFormFieldsProps = {
  values: CourtFormValues;
  sports: SportOption[];
  copy: CourtFormCopy;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSportIdsChange?: (sportIds: string[]) => void;
  extras?: ReactNode;
};

type FieldName =
  | "name"
  | "description"
  | "price_note"
  | "phone"
  | "line_id"
  | "website_url";

const fieldConfigs: { name: FieldName; labelKey: keyof CourtFormCopy; required: boolean }[] = [
  { name: "name", labelKey: "name", required: true },
  { name: "description", labelKey: "description", required: false },
  { name: "price_note", labelKey: "price", required: false },
  { name: "phone", labelKey: "phone", required: false },
  { name: "line_id", labelKey: "line", required: false },
  { name: "website_url", labelKey: "website", required: false },
];

function LocationDetailItem({
  icon,
  label,
  value,
  mono = false,
  fullWidth = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_10px_30px_rgb(var(--foreground-rgb)/0.05)] ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          {icon}
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p
            className={`break-words text-sm text-slate-800 ${
              mono ? "font-mono text-[13px]" : "font-medium"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LocationDetailsCard({
  values,
  copy,
}: LocationDetailsCardProps) {
  const hasResolvedLocation = Boolean(
    values.address.trim() ||
      values.district.trim() ||
      values.province.trim() ||
      values.latitude.trim() ||
      values.longitude.trim() ||
      values.googlePlaceId.trim(),
  );

  if (!hasResolvedLocation) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(255,255,255,0.96))] shadow-[0_18px_60px_rgb(var(--rt-primary-rgb)/0.08)]">
      <div className="border-b border-emerald-100/80 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-100">
              <ScanSearch className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
              Google Maps
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {copy.locationDetailsTitle}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {copy.locationDetailsHelper}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <LockKeyhole className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
            {copy.locationLockedBadge}
          </div>
        </div>
      </div>
      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
        {values.address.trim() && (
          <LocationDetailItem
            icon={<MapPinned className="h-4 w-4" strokeWidth={1.9} aria-hidden />}
            label={copy.address}
            value={values.address.trim()}
            fullWidth
          />
        )}
        {values.district.trim() && (
          <LocationDetailItem
            icon={<MapPinPlusInside className="h-4 w-4" strokeWidth={1.9} aria-hidden />}
            label={copy.district}
            value={values.district.trim()}
          />
        )}
        {values.province.trim() && (
          <LocationDetailItem
            icon={<Landmark className="h-4 w-4" strokeWidth={1.9} aria-hidden />}
            label={copy.province}
            value={values.province.trim()}
          />
        )}
      </div>
    </section>
  );
}

export function CourtFormFields({
  values,
  sports,
  copy,
  onChange,
  onSportIdsChange,
  extras,
}: CourtFormFieldsProps) {
  const selectedSportIds =
    values.sportIds.length > 0
      ? values.sportIds
      : values.sportId
        ? [values.sportId]
        : [];
  const selectedLabels = sports
    .filter((sport) => selectedSportIds.includes(sport.id))
    .map((sport) => sport.label);
  const toggleSport = (sportId: string) => {
    if (!onSportIdsChange) return;
    if (selectedSportIds.includes(sportId) && selectedSportIds.length === 1) {
      return;
    }
    const next = selectedSportIds.includes(sportId)
      ? selectedSportIds.filter((id) => id !== sportId)
      : [...selectedSportIds, sportId];
    onSportIdsChange(next);
  };

  return (
    <>
      {onSportIdsChange ? (
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            {copy.selectSport}
          </span>
          <details className="group relative">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-300">
              <span className="line-clamp-2">
                {selectedLabels.length > 0
                  ? selectedLabels.join(", ")
                  : copy.selectSport}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180"
                strokeWidth={1.8}
                aria-hidden
              />
            </summary>
            <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {sports.map((sport) => (
                <label
                  key={sport.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSportIds.includes(sport.id)}
                    onChange={() => toggleSport(sport.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-300"
                  />
                  <span>{sport.label}</span>
                </label>
              ))}
            </div>
          </details>
          <input
            type="hidden"
            name="sportId"
            value={selectedSportIds[0] ?? ""}
            required
          />
        </div>
      ) : (
        <BaseSelect
          label={copy.selectSport}
          name="sportId"
          value={values.sportId}
          onChange={onChange}
          required
          options={sports.map((sport) => ({
            value: sport.id,
            label: sport.label,
          }))}
          variant="light"
        />
      )}
      {fieldConfigs.map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-semibold text-slate-700">
            {copy[field.labelKey]}
          </label>
          {field.name === "description" || field.name === "price_note" ? (
            <>
              <BaseTextArea
                name={field.name}
                value={values[field.name]}
                onChange={onChange}
                required={field.required}
                rows={4}
                variant="light"
              />
              {field.name === "price_note" && (
                <p className="text-xs text-slate-500">
                  Supports basic HTML (e.g., &lt;strong&gt;, &lt;br/&gt;).
                </p>
              )}
            </>
          ) : (
            <BaseTextField
              type="text"
              name={field.name}
              value={values[field.name]}
              onChange={onChange}
              required={field.required}
              variant="light"
            />
          )}
        </div>
      ))}
      <input type="hidden" name="provinceId" value={values.provinceId} />
      <input type="hidden" name="districtId" value={values.districtId} />
      {extras}
    </>
  );
}
