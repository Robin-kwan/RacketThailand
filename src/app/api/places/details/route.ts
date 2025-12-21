import { NextResponse } from "next/server";
import {
  normalizePlaceDetails,
  type GoogleAddressComponent,
  type PlaceDetailsPayload,
} from "@/lib/google-places";
import type { MapCoordinates } from "@/lib/google-maps";

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

type RequestPayload = {
  placeId?: string;
  sessionToken?: string;
};

type SuccessResponse = {
  coordinates: MapCoordinates;
  place?: PlaceDetailsPayload | null;
};

export async function POST(request: Request) {
  if (!GOOGLE_PLACES_KEY) {
    return NextResponse.json(
      { error: "Google Places API key is not configured." },
      { status: 500 },
    );
  }

  let payload: RequestPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 },
    );
  }

  if (!payload.placeId) {
    return NextResponse.json(
      { error: "placeId is required." },
      { status: 400 },
    );
  }

  const detailsUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  detailsUrl.searchParams.set("place_id", payload.placeId);
  detailsUrl.searchParams.set(
    "fields",
    "name,formatted_address,address_component,opening_hours,website,international_phone_number,formatted_phone_number,geometry",
  );
  detailsUrl.searchParams.set("language", "th");
  detailsUrl.searchParams.set("key", GOOGLE_PLACES_KEY);
  if (payload.sessionToken) {
    detailsUrl.searchParams.set("sessiontoken", payload.sessionToken);
  }

  const response = await fetch(detailsUrl);
  const data = (await response.json()) as {
    status: string;
    result?: {
      name?: string;
      formatted_address?: string;
      address_components?: GoogleAddressComponent[];
      opening_hours?: { weekday_text?: string[] };
      website?: string;
      international_phone_number?: string;
      formatted_phone_number?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    };
    error_message?: string;
  };

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json(
      { error: data.error_message || "Unable to fetch place details." },
      { status: 502 },
    );
  }

  const location = data.result.geometry?.location;
  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    return NextResponse.json(
      { error: "Place details missing coordinates." },
      { status: 502 },
    );
  }

  const coordinates: MapCoordinates = {
    latitude: location.lat.toString(),
    longitude: location.lng.toString(),
  };

  const place = normalizePlaceDetails(data.result);

  return NextResponse.json<SuccessResponse>({
    coordinates,
    place,
  });
}
