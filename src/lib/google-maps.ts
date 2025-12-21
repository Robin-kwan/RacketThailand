export type MapCoordinates = {
  latitude: string;
  longitude: string;
};

const COORD_PAIR_REGEX = /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/;
const AT_PATTERN_REGEX = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/;
const BANG_PATTERN_REGEX = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/;

export function extractLatLngFromText(text: string): MapCoordinates | null {
  if (!text) return null;
  const atMatch = text.match(AT_PATTERN_REGEX);
  if (atMatch) {
    return { latitude: atMatch[1], longitude: atMatch[2] };
  }
  const bangMatch = text.match(BANG_PATTERN_REGEX);
  if (bangMatch) {
    return { latitude: bangMatch[1], longitude: bangMatch[2] };
  }
  const pairMatch = text.match(COORD_PAIR_REGEX);
  if (pairMatch) {
    return { latitude: pairMatch[1], longitude: pairMatch[2] };
  }
  return null;
}

export function extractLatLngFromLink(link: string): MapCoordinates | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromHref = extractLatLngFromText(url.href);
    if (fromHref) return fromHref;
    const queryParam =
      url.searchParams.get("q") ??
      url.searchParams.get("query") ??
      url.searchParams.get("destination");
    if (queryParam) {
      const coords = extractLatLngFromText(queryParam);
      if (coords) return coords;
    }
  } catch {
    // ignore invalid URL errors and attempt raw parsing below
  }

  return extractLatLngFromText(trimmed);
}
