"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
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
  price: string;
  openingHours: string;
  phone: string;
  line: string;
  lineQr: string;
  website: string;
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
  | "address"
  | "district"
  | "province"
  | "price_note"
  | "phone"
  | "line_id"
  | "website_url";

const fieldConfigs: { name: FieldName; labelKey: keyof CourtFormCopy; required: boolean }[] = [
  { name: "name", labelKey: "name", required: true },
  { name: "description", labelKey: "description", required: false },
  { name: "address", labelKey: "address", required: true },
  { name: "district", labelKey: "district", required: true },
  { name: "province", labelKey: "province", required: true },
  { name: "price_note", labelKey: "price", required: false },
  { name: "phone", labelKey: "phone", required: false },
  { name: "line_id", labelKey: "line", required: false },
  { name: "website_url", labelKey: "website", required: false },
];

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
      {extras}
    </>
  );
}
