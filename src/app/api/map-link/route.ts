import { NextResponse } from "next/server";
import {
  extractLatLngFromLink,
  extractLatLngFromText,
  type MapCoordinates,
} from "@/lib/google-maps";
import {
  extractAddressComponent,
  normalizePlaceDetails,
  type GoogleAddressComponent,
  type PlaceDetailsPayload,
} from "@/lib/google-places";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

type RequestPayload = {
  link?: string;
};

type SuccessResponse = {
  coordinates: MapCoordinates;
  place?: PlaceDetailsPayload | null;
};

export async function POST(request: Request) {
  let linkPayload: RequestPayload;
  try {
    linkPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 },
    );
  }

  const link = linkPayload.link?.trim();
  if (!link) {
    return NextResponse.json(
      { error: "Link is required." },
      { status: 400 },
    );
  }

  const coordinates = await resolveCoordinates(link);
  if (!coordinates) {
    return NextResponse.json(
      { error: "Unable to parse location from link." },
      { status: 422 },
    );
  }

  const place = await resolvePlaceDetails(coordinates).catch(() => null);

  return NextResponse.json<SuccessResponse>({
    coordinates,
    place: place ?? undefined,
  });
}

async function resolveCoordinates(link: string): Promise<MapCoordinates | null> {
  const direct = extractLatLngFromLink(link);
  if (direct) {
    return direct;
  }

  let response: Response;
  try {
    const parsed = new URL(link);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    response = await fetch(link, {
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
  } catch {
    return null;
  }

  const fromRedirect = extractLatLngFromText(response.url);
  if (fromRedirect) {
    return fromRedirect;
  }

  try {
    const html = await response.text();
    const fromBody = extractLatLngFromText(html);
    if (fromBody) {
      return fromBody;
    }
  } catch {
    // ignore body parsing errors
  }
  return null;
}

async function resolvePlaceDetails(
  coordinates: MapCoordinates,
): Promise<PlaceDetailsPayload | null> {
  if (!GOOGLE_PLACES_KEY) return null;
  const latlng = `${coordinates.latitude},${coordinates.longitude}`;

  const geocodeUrl = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json",
  );
  geocodeUrl.searchParams.set("latlng", latlng);
  geocodeUrl.searchParams.set("key", GOOGLE_PLACES_KEY);
  geocodeUrl.searchParams.set("language", "th");
  const geocodeResponse = await fetch(geocodeUrl);
  const geocodeData = (await geocodeResponse.json()) as {
    status: string;
    results?: Array<{
      place_id?: string;
      formatted_address?: string;
      address_components?: GoogleAddressComponent[];
    }>;
  };
  if (
    geocodeData.status !== "OK" ||
    !geocodeData.results ||
    geocodeData.results.length === 0
  ) {
    return null;
  }
  const [primary] = geocodeData.results;
  const baseComponents = primary.address_components ?? [];

  const baseDetails: PlaceDetailsPayload = {
    address: primary.formatted_address,
    district: extractAddressComponent(baseComponents, [
      "administrative_area_level_2",
      "sublocality_level_1",
      "sublocality",
      "locality",
    ]),
    province: extractAddressComponent(baseComponents, [
      "administrative_area_level_1",
    ]),
  };

  if (!primary.place_id) {
    return baseDetails;
  }

  const detailsUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  detailsUrl.searchParams.set("place_id", primary.place_id);
  detailsUrl.searchParams.set(
    "fields",
    "name,formatted_address,address_component,opening_hours,website,international_phone_number",
  );
  detailsUrl.searchParams.set("language", "th");
  detailsUrl.searchParams.set("key", GOOGLE_PLACES_KEY);
  const detailResponse = await fetch(detailsUrl);
  const detailData = (await detailResponse.json()) as {
    status: string;
    result?: {
      name?: string;
      formatted_address?: string;
      address_components?: GoogleAddressComponent[];
      opening_hours?: { weekday_text?: string[] };
      website?: string;
      international_phone_number?: string;
    };
  };

  if (detailData.status !== "OK" || !detailData.result) {
    return baseDetails;
  }

  return normalizePlaceDetails(detailData.result, baseDetails);
}

function extractAddressComponent(
  components: GoogleAddressComponent[],
  types: string[],
): string | undefined {
  for (const type of types) {
    const component = components.find((entry) => entry.types.includes(type));
    if (component) {
      return component.long_name || component.short_name;
    }
  }
  return undefined;
}
