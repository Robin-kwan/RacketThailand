import type { Locale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import {
  fetchCourtIdsBySportId,
  fetchSportIdsByCourtId,
} from "@/server/courtSports";
import {
  localizeThailandLocation,
  resolveThailandLocationIds,
} from "@/server/thailand-location";

export type CourtRecord = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  district_id?: number | null;
  province_id?: number | null;
  price_note: string | null;
  opening_hours: OpeningHoursEntry[] | null;
  phone: string | null;
  line_id: string | null;
  line_qr_url?: string | null;
  website_url: string | null;
  google_place_id?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
  created_by?: string | null;
  court_photos?: { image_url: string | null; is_primary: boolean | null }[];
  latitude?: number | null;
  longitude?: number | null;
};

export type CourtProvinceOption = {
  value: string;
  label: string;
};

type SportRow = {
  id: string;
  code: string;
  name: string | null;
};

export type CourtFilterOptions = {
  search?: string;
  province?: string;
  limit?: number;
  offset?: number;
};

export async function fetchSportRow(code: string) {
  const { data } = await supabaseSelect<SportRow>("sports", {
    select: "id,code,name",
    code: `eq.${code}`,
    limit: "1",
  });
  return data[0] ?? null;
}

function buildSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(name.ilike.${term},description.ilike.${term},district.ilike.${term},province.ilike.${term},address.ilike.${term})`;
}

function slugifyLocationName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applySportFilter(
  params: Record<string, string>,
  courtIds: string[],
  searchClause?: string,
) {
  if (courtIds.length > 0) {
    params.id = `in.(${courtIds.join(",")})`;
  } else {
    params.id = "eq.00000000-0000-0000-0000-000000000000";
  }
  if (searchClause) {
    params.or = searchClause;
  }
}

export async function fetchCourtFilters(
  sportId: string,
  locale: Locale,
): Promise<CourtProvinceOption[]> {
  const courtIds = await fetchCourtIdsBySportId(sportId);
  const params: Record<string, string> = {
    select: "province,province_id",
    is_active: "eq.true",
    order: "province_id.asc.nullslast,province.asc.nullslast",
  };
  applySportFilter(params, courtIds);

  const { data } = await supabaseSelect<{
    province: string | null;
    province_id: number | null;
  }>("courts", {
    ...params,
  });

  const options = await Promise.all(
    Array.from(
      new Map(
        (data ?? [])
          .map((row) => {
            const fallbackValue =
              row.province_id != null
                ? String(row.province_id)
                : (row.province ?? "").trim();
            return fallbackValue
              ? [fallbackValue, row] as const
              : null;
          })
          .filter((entry): entry is readonly [string, { province: string | null; province_id: number | null }] => entry !== null),
      ).values(),
    ).map(async (row) => {
      const localized = await localizeThailandLocation(
        {
          province_id: row.province_id,
          province: row.province,
        },
        locale,
      );
      const english = await localizeThailandLocation(
        {
          province_id: row.province_id,
          province: row.province,
        },
        "en",
      );
      const value =
        slugifyLocationName(english.province ?? row.province ?? "") ||
        (row.province ?? "").trim();
      return {
        value,
        label: localized.province ?? value,
      };
    }),
  );

  return options.sort((a, b) =>
    a.label.localeCompare(b.label, locale === "th" ? "th" : "en"),
  );
}

export async function fetchCourtsBySport(
  sportCode: string,
  filters: CourtFilterOptions = {},
  locale: Locale = "th",
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { courts: [], count: 0, provinces: [], sport: null };
  }

  const params: Record<string, string> = {
    select:
      "id,name,description,address,district,province,district_id,province_id,price_note,phone,line_id,website_url,google_place_id,created_at,updated_at,is_active,latitude:lat,longitude:lng,court_photos(image_url,is_primary)",
    is_active: "eq.true",
    order: "created_at.desc",
  };

  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.offset) {
    params.offset = String(filters.offset);
  }
  const provinceFilter = filters.province?.trim();
  if (provinceFilter) {
    const provinceId = Number(provinceFilter);
    if (Number.isFinite(provinceId)) {
      params.province_id = `eq.${provinceId}`;
    } else {
      const resolved = await resolveThailandLocationIds({
        province: provinceFilter,
      });
      if (resolved.provinceId) {
        params.province_id = `eq.${resolved.provinceId}`;
      } else {
        params.province = `eq.${provinceFilter}`;
      }
    }
  }
  const searchClause = filters.search
    ? buildSearchClause(filters.search)
    : undefined;
  const courtIds = await fetchCourtIdsBySportId(sportRow.id);
  applySportFilter(params, courtIds, searchClause);

  const [courtsRes, provinces] = await Promise.all([
    supabaseSelect<CourtRecord>("courts", params),
    fetchCourtFilters(sportRow.id, locale),
  ]);

  const localizedCourts = await Promise.all(
    (courtsRes.data ?? []).map(async (court) => {
      const localized = await localizeThailandLocation(court, locale);
      return {
        ...court,
        district: localized.district,
        province: localized.province,
      };
    }),
  );

  return {
    sport: sportRow,
    courts: localizedCourts,
    count: courtsRes.count ?? 0,
    provinces,
  };
}

export type CourtPhoto = {
  id: string;
  image_url: string;
  is_primary: boolean | null;
};

type CourtGroupLink = {
  id: string;
  verification_status: string | null;
  verified_by: string | null;
  verified_at: string | null;
  note: string | null;
    groups: {
      id: string;
      name: string | null;
      description: string | null;
      allow_walk_in: boolean | null;
      play_format: "single" | "double" | null;
      sports?: { code: string; name: string | null } | null;
      group_photos?: {
        image_url: string | null;
        is_primary: boolean | null;
      }[] | null;
      group_sessions?: {
        court_id: string;
        day: string;
        start_time: string | null;
        end_time: string | null;
      }[] | null;
    } | null;
};

export async function fetchCourtDetail(
  courtId: string,
  locale: Locale = "th",
) {
  const { data: courts } = await supabaseSelect<CourtRecord>("courts", {
    select:
      "id,name,description,address,district,province,district_id,province_id,price_note,opening_hours,phone,line_id,line_qr_url,website_url,google_place_id,created_at,updated_at,is_active,created_by,latitude:lat,longitude:lng",
    id: `eq.${courtId}`,
    limit: "1",
  });

  const court = courts?.[0];
  if (!court) {
    return null;
  }

  const sportIds = await fetchSportIdsByCourtId(courtId);
  const [{ data: sportRows }, { data: photos }, { data: groupLinks }] =
    await Promise.all([
      supabaseSelect<SportRow>("sports", {
        select: "id,code,name",
        id:
          sportIds.length > 0
            ? `in.(${sportIds.join(",")})`
            : "eq.00000000-0000-0000-0000-000000000000",
      }),
      supabaseSelect<CourtPhoto>("court_photos", {
        select: "id,image_url,is_primary",
        court_id: `eq.${courtId}`,
        order: "is_primary.desc,created_at.asc",
        limit: "12",
      }),
      supabaseSelect<CourtGroupLink>("court_groups", {
        select:
          "id,verification_status,verified_by,verified_at,note,groups(id,name,description,allow_walk_in,play_format,sports(code,name),group_photos(image_url,is_primary),group_sessions(court_id,day,start_time,end_time))",
        court_id: `eq.${courtId}`,
        order: "created_at.desc",
      }),
    ]);

  const sport =
    sportRows?.find((row) => row.id === sportIds[0]) ?? sportRows?.[0];
  const localizedCourtNames = await localizeThailandLocation(court, locale);

  return {
    court: {
      ...court,
      district: localizedCourtNames.district,
      province: localizedCourtNames.province,
    },
    sport,
    sports: sportRows ?? [],
    photos: photos ?? [],
    groups: groupLinks ?? [],
  };
}
