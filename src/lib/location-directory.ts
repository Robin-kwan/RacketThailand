export type LocationKind = "courts" | "groups";

export type DirectoryProvince = {
  id: number;
  name_th: string;
  name_en: string;
};
export type DirectoryCourt = {
  id: string;
  province_id: number | null;
  province?: string | null;
  is_active: boolean;
  court_sports?: { sport_id: string }[];
};
export type DirectoryGroup = {
  id: string;
  sport_id: string;
  status: string;
  court_groups?: { court_id: string }[];
  group_sessions?: { court_id: string | null }[];
  group_events?: {
    court_id: string | null;
    starts_at: string;
    ends_at: string | null;
  }[];
};
export type LocationEntry = {
  sport: string;
  slug: string;
  provinceId: number;
  name: { th: string; en: string };
  courtIds: string[];
  groupIds: string[];
};

export const LOCATION_PAGE_SIZE = 12;

export function locationSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function locationPath(
  sport: string,
  kind: LocationKind,
  slug: string,
  page = 1,
) {
  return `/${sport}/${kind === "courts" ? "court-finder" : "group-finder"}/${slug}${page > 1 ? `?page=${page}` : ""}`;
}

export function parseLocationPage(value: string | string[] | undefined) {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

// Only public listings with a known venue contribute to a location page.
// A group can belong to several provinces, but is counted once in each.
export function buildLocationDirectory(
  provinces: DirectoryProvince[],
  sports: { id: string; code: string }[],
  courts: DirectoryCourt[],
  groups: DirectoryGroup[],
  now = Date.now(),
): LocationEntry[] {
  const sportCodes = new Map(sports.map((sport) => [sport.id, sport.code]));
  const provinceMap = new Map(
    provinces.map((province) => [province.id, province]),
  );
  const entries = new Map<string, LocationEntry>();
  const courtProvinces = new Map<string, number>();
  const getEntry = (sport: string, provinceId: number) => {
    const province = provinceMap.get(provinceId);
    if (!province) return null;
    const slug = locationSlug(province.name_en);
    if (!slug) return null;
    const key = `${sport}/${provinceId}`;
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        sport,
        slug,
        provinceId,
        name: { th: province.name_th, en: province.name_en },
        courtIds: [],
        groupIds: [],
      };
      entries.set(key, entry);
    }
    return entry;
  };

  for (const court of courts) {
    if (
      !court.is_active ||
      !court.province_id ||
      !provinceMap.has(court.province_id)
    )
      continue;
    courtProvinces.set(court.id, court.province_id);
    const sportIds = new Set(
      (court.court_sports ?? []).map((sport) => sport.sport_id),
    );
    for (const sportId of sportIds) {
      const sport = sportId ? sportCodes.get(sportId) : undefined;
      if (sport) getEntry(sport, court.province_id)?.courtIds.push(court.id);
    }
  }
  for (const group of groups) {
    const sport = sportCodes.get(group.sport_id);
    if (group.status !== "published" || !sport) continue;
    const activeEvents = (group.group_events ?? []).filter(
      (event) => Date.parse(event.ends_at ?? event.starts_at) > now,
    );
    const venues = [
      ...(group.court_groups ?? []),
      ...(group.group_sessions ?? []),
      ...activeEvents,
    ];
    const provinceIds = new Set(
      venues.flatMap(({ court_id }) => {
        const provinceId = court_id ? courtProvinces.get(court_id) : undefined;
        return provinceId ? [provinceId] : [];
      }),
    );
    for (const provinceId of provinceIds)
      getEntry(sport, provinceId)?.groupIds.push(group.id);
  }
  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      courtIds: [...new Set(entry.courtIds)].sort(),
      groupIds: [...new Set(entry.groupIds)].sort(),
    }))
    .sort(
      (a, b) => a.sport.localeCompare(b.sport) || a.slug.localeCompare(b.slug),
    );
}
