"use client";

import { ReactNode } from "react";
import { BaseSelect } from "@/components/base-select";

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
  opening_hours: string;
  phone: string;
  line_id: string;
  website_url: string;
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
  website: string;
};

type CourtFormFieldsProps = {
  values: CourtFormValues;
  sports: SportOption[];
  copy: CourtFormCopy;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  extras?: ReactNode;
};

type FieldName =
  | "name"
  | "address"
  | "district"
  | "province"
  | "price_note"
  | "opening_hours"
  | "phone"
  | "line_id"
  | "website_url";

const fieldConfigs: { name: FieldName; labelKey: keyof CourtFormCopy; required: boolean }[] = [
  { name: "name", labelKey: "name", required: true },
  { name: "address", labelKey: "address", required: false },
  { name: "district", labelKey: "district", required: false },
  { name: "province", labelKey: "province", required: false },
  { name: "price_note", labelKey: "price", required: false },
  { name: "opening_hours", labelKey: "openingHours", required: false },
  { name: "phone", labelKey: "phone", required: false },
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
      />
      {fieldConfigs.map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-semibold text-slate-700">
            {copy[field.labelKey]}
          </label>
          <input
            type="text"
            name={field.name}
            value={values[field.name]}
            onChange={onChange}
            required={field.required}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>
      ))}
      {extras}
    </>
  );
}
