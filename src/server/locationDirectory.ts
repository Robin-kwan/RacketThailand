import { cache } from "react";
import { unstable_cache } from "next/cache";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { supabaseSelect } from "@/lib/supabaseRest";
import {
  buildLocationDirectory,
  type DirectoryCourt,
  type DirectoryGroup,
  type DirectoryProvince,
} from "@/lib/location-directory";
import { resolveThailandLocationIds } from "@/server/thailand-location";
import { buildActiveGroupEventsOrFilter } from "@/server/groupEvents";

// Fetch small index records in batches; never ship the full directory to clients.
async function fetchIndexRows<T>(
  table: string,
  params: Record<string, string>,
) {
  const rows: T[] = [];
  let expectedCount = Infinity;
  while (rows.length < expectedCount) {
    const result = await supabaseSelect<T>(table, {
      ...params,
      order: "id.asc",
      limit: "500",
      offset: String(rows.length),
    });
    expectedCount = result.count ?? expectedCount;
    rows.push(...result.data);
    if (result.data.length === 0) break;
  }
  return rows;
}

const loadDirectory = unstable_cache(
  async () => {
    const [provinces, sports, courts, groups] = await Promise.all([
      fetchIndexRows<DirectoryProvince>("provinces", {
        select: "id,name_th,name_en",
      }),
      fetchIndexRows<{ id: string; code: string }>("sports", {
        select: "id,code",
        code: `in.(${SUPPORTED_SPORTS.join(",")})`,
      }),
      fetchIndexRows<DirectoryCourt>("courts", {
        select: "id,province_id,province,is_active,court_sports(sport_id)",
        is_active: "eq.true",
      }),
      fetchIndexRows<DirectoryGroup>("groups", {
        select:
          "id,sport_id,status,court_groups(court_id),group_sessions(court_id),group_events(court_id,starts_at,ends_at)",
        status: "eq.published",
        "group_events.or": buildActiveGroupEventsOrFilter(new Date()),
      }),
    ]);
    const normalizedCourts = await Promise.all(
      courts.map(async (court) => {
        if (court.province_id || !court.province) return court;
        const resolved = await resolveThailandLocationIds({
          province: court.province,
        });
        return { ...court, province_id: resolved.provinceId };
      }),
    );
    return buildLocationDirectory(provinces, sports, normalizedCourts, groups);
  },
  ["populated-location-directory-v1"],
  { revalidate: 300 },
);

export const fetchLocationDirectory = cache(loadDirectory);

// Optional discovery links must not take down a working finder or sitemap.
export async function fetchLocationNavigation() {
  try {
    return await fetchLocationDirectory();
  } catch (error) {
    console.error("Failed to load province discovery links", error);
    return [];
  }
}
