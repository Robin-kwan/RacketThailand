"use client";

import { ReactNode } from "react";
import { BaseSelect } from "@/components/base-select";
import { BaseTextField } from "@/components/base-text-field";
import { BaseTextArea } from "@/components/base-text-area";

type SportOption = {
  id: string;
  label: string;
};

export type CourtFormValues = {
  sportId: string;
  name: string;
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
  extras?: ReactNode;
};

type FieldName =
  | "name"
  | "address"
  | "district"
  | "province"
  | "price_note"
  | "phone"
  | "line_id"
  | "website_url";

const fieldConfigs: { name: FieldName; labelKey: keyof CourtFormCopy; required: boolean }[] = [
  { name: "name", labelKey: "name", required: true },
  { name: "address", labelKey: "address", required: true },
  { name: "district", labelKey: "district", required: true },
  { name: "province", labelKey: "province", required: true },
  { name: "price_note", labelKey: "price", required: false },
  { name: "phone", labelKey: "phone", required: true },
  { name: "line_id", labelKey: "line", required: false },
  { name: "website_url", labelKey: "website", required: false },
];

export function CourtFormFields({
  values,
  sports,
  copy,
  onChange,
  extras,
}: CourtFormFieldsProps) {
  return (
    <>
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
      {fieldConfigs.map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-semibold text-slate-700">
            {copy[field.labelKey]}
          </label>
          {field.name === "price_note" ? (
            <>
              <BaseTextArea
                name={field.name}
                value={values[field.name]}
                onChange={onChange}
                required={field.required}
                rows={4}
                variant="light"
              />
              <p className="text-xs text-slate-500">
                Supports basic HTML (e.g., &lt;strong&gt;, &lt;br/&gt;).
              </p>
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
