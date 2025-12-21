import {
  formatStructuredHours,
  googlePeriodsToStructured,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type PlaceDetailsPayload = {
  name?: string;
  address?: string;
  district?: string;
  province?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  openingHoursStructured?: OpeningHoursEntry[];
};

const DISTRICT_TYPES = [
  "administrative_area_level_2",
  "sublocality_level_1",
  "sublocality",
  "locality",
];

const PROVINCE_TYPES = ["administrative_area_level_1"];

export function extractAddressComponent(
  components: GoogleAddressComponent[],
  types: string[],
): string | undefined {
  for (const type of types) {
    const target = components.find((component) =>
      component.types.includes(type),
    );
    if (target) {
      return target.long_name || target.short_name;
    }
  }
  return undefined;
}

export function normalizePlaceDetails(
  result: {
    name?: string;
    formatted_address?: string;
    address_components?: GoogleAddressComponent[];
    opening_hours?: {
      weekday_text?: string[];
      periods?: { open?: { day?: number; time?: string }; close?: { day?: number; time?: string } }[];
    };
    website?: string;
    international_phone_number?: string;
    formatted_phone_number?: string;
  },
  fallback?: PlaceDetailsPayload,
): PlaceDetailsPayload {
  const components = result.address_components ?? [];
  const openingHours = result.opening_hours?.weekday_text?.join("\n");
  const structured = googlePeriodsToStructured(
    result.opening_hours?.periods,
  );
  const structuredText =
    structured.length > 0 ? formatStructuredHours(structured) : undefined;

  return {
    name: result.name ?? fallback?.name,
    address: result.formatted_address ?? fallback?.address,
    district:
      extractAddressComponent(components, DISTRICT_TYPES) ?? fallback?.district,
    province:
      extractAddressComponent(components, PROVINCE_TYPES) ??
      fallback?.province,
    phone:
      result.international_phone_number ??
      result.formatted_phone_number ??
      fallback?.phone,
    website: result.website ?? fallback?.website,
    openingHours:
      openingHours ?? structuredText ?? fallback?.openingHours,
    openingHoursStructured:
      structured.length > 0
        ? structured
        : fallback?.openingHoursStructured,
  };
}
