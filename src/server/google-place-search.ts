export type PlaceSuggestion = {
  description: string;
  placeId: string;
  secondary?: string;
};

export class PlaceSearchError extends Error {
  constructor(public code: "invalidLink" | "unresolvedLink" | "lookupFailed") {
    super(code);
  }
}

export function parseGoogleMapsUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new PlaceSearchError("invalidLink");
  }
  const mapsHost = [
    "google.com",
    "www.google.com",
    "google.co.th",
    "www.google.co.th",
  ];
  const valid =
    (mapsHost.includes(url.hostname) && /^\/maps(?:\/|$)/.test(url.pathname)) ||
    [
      "maps.google.com",
      "maps.google.co.th",
      "maps.app.goo.gl",
      "share.google",
    ].includes(url.hostname) ||
    (url.hostname === "goo.gl" && url.pathname.startsWith("/maps/"));
  if (
    !valid ||
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new PlaceSearchError("invalidLink");
  }
  return url;
}

export function extractGoogleMapsTarget(url: URL): {
  placeId?: string;
  query?: string;
} {
  const id =
    url.searchParams.get("query_place_id") ??
    url.searchParams.get("destination_place_id") ??
    url.searchParams.get("place_id");
  if (id && /^[A-Za-z0-9_-]{10,256}$/.test(id)) return { placeId: id };
  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  if (q?.startsWith("place_id:")) return { placeId: q.slice(9) };

  // Some Maps directions links encode the two 64-bit feature IDs, not a Place ID.
  // This is a Maps URL format (not an API guarantee): validate its exact shape and
  // always verify the resulting identifier with Place Details before offering it.
  const geocode = url.searchParams.get("geocode");
  if (geocode && /^[A-Za-z0-9_-]{24}$/.test(geocode)) {
    const bytes = Buffer.from(geocode, "base64url");
    if (bytes.length === 18 && bytes[0] === 0x29 && bytes[9] === 0x31) {
      return {
        placeId: Buffer.concat([
          Buffer.from([10, 18, 9]),
          bytes.subarray(1, 9),
          Buffer.from([17]),
          bytes.subarray(10, 18),
        ]).toString("base64url"),
      };
    }
  }
  const decoded = decodeURIComponent(url.pathname + url.search);
  const feature = decoded.match(/!1s(0x[0-9a-f]+):(0x[0-9a-f]+)/i);
  if (feature && feature[1].length <= 18 && feature[2].length <= 18) {
    const bytes = Buffer.alloc(16);
    bytes.writeBigUInt64LE(BigInt(feature[1]), 0);
    bytes.writeBigUInt64LE(BigInt(feature[2]), 8);
    return {
      placeId: Buffer.concat([
        Buffer.from([10, 18, 9]),
        bytes.subarray(0, 8),
        Buffer.from([17]),
        bytes.subarray(8),
      ]).toString("base64url"),
    };
  }
  const embeddedId = decoded.match(/!1s(ChI[A-Za-z0-9_-]+)/);
  if (embeddedId) return { placeId: embeddedId[1] };
  const name = url.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const query = name
    ? decodeURIComponent(name).replace(/\+/g, " ")
    : (q ??
      url.searchParams.get("destination") ??
      url.searchParams.get("daddr"));
  // Never reverse-geocode the camera center or a dropped pin into a venue.
  if (query && !/^\s*[-+\d.,\s]+$/.test(query)) return { query };
  return {};
}

export async function resolveGoogleMapsTarget(input: string) {
  let url = parseGoogleMapsUrl(input.trim());
  const signal = AbortSignal.timeout(8000);
  for (let hop = 0; hop < 5; hop++) {
    const target = extractGoogleMapsTarget(url);
    if (target.placeId || target.query) return target;
    const response = await fetch(url, { redirect: "manual", signal });
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) break;
    // Validate every redirect before fetching it; do not follow arbitrary hosts.
    url = parseGoogleMapsUrl(new URL(location, url).href);
  }
  throw new PlaceSearchError("unresolvedLink");
}

type GooglePlace = {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  types?: string[];
  address_components?: Array<{ short_name?: string; types: string[] }>;
};

async function googleLookup(path: string, params: Record<string, string>) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new PlaceSearchError("lookupFailed");
  const url = new URL(
    `https://maps.googleapis.com/maps/api/place/${path}/json`,
  );
  url.search = new URLSearchParams({
    ...params,
    language: "th",
    key,
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    status: string;
    results?: GooglePlace[];
    result?: GooglePlace;
  };
  if (!response.ok || !["OK", "ZERO_RESULTS"].includes(data.status))
    throw new PlaceSearchError("lookupFailed");
  return data;
}

export async function searchGooglePlaces(
  input: string,
  isLink: boolean,
): Promise<PlaceSuggestion[]> {
  const target = isLink
    ? await resolveGoogleMapsTarget(input)
    : { query: input };
  let places: GooglePlace[];
  if (target.placeId) {
    const data = await googleLookup("details", {
      place_id: target.placeId,
      fields: "name,formatted_address,place_id,types,address_component",
    });
    places = data.result ? [data.result] : [];
  } else {
    const data = await googleLookup("textsearch", {
      query: target.query!,
      region: "th",
    });
    places = data.results ?? [];
  }
  const seen = new Set<string>();
  return places
    .flatMap((place) => {
      const country = place.address_components?.find((c) =>
        c.types.includes("country"),
      )?.short_name;
      const inThailand = country
        ? country === "TH"
        : /(?:ประเทศไทย|Thailand)\s*$/i.test(place.formatted_address ?? "");
      if (
        !inThailand ||
        !place.types?.includes("establishment") ||
        !place.place_id ||
        !place.name ||
        seen.has(place.place_id)
      )
        return [];
      seen.add(place.place_id);
      return [
        {
          placeId: place.place_id,
          description: place.name,
          secondary: place.formatted_address,
        },
      ];
    })
    .slice(0, 20);
}
