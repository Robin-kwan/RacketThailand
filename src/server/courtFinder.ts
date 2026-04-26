import { supabaseSelect } from "@/lib/supabaseRest";
import type { OpeningHoursEntry } from "@/lib/opening-hours";

export type CourtRecord = {
  id: string;
  name: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
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
  sport_id?: string | null;
  court_photos?: { image_url: string | null; is_primary: boolean | null }[];
  latitude?: number | null;
  longitude?: number | null;
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
  return `(name.ilike.${term},district.ilike.${term},province.ilike.${term},address.ilike.${term})`;
}

export async function fetchCourtFilters(
  sportId: string,
): Promise<string[]> {
  const { data } = await supabaseSelect<{ province: string | null }>("courts", {
    select: "province",
    sport_id: `eq.${sportId}`,
    is_active: "eq.true",
    order: "province.asc.nullslast",
  });
  return (
    Array.from(
      new Set(
        data
          ?.map((row) => row.province)
          .filter(
            (province): province is string =>
              Boolean(province && province.trim()),
          ) ?? [],
      ),
    ).sort((a, b) => a.localeCompare(b))
  );
}

export async function fetchCourtsBySport(
  sportCode: string,
  filters: CourtFilterOptions = {},
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { courts: [], count: 0, provinces: [], sport: null };
  }

  const params: Record<string, string> = {
    select:
      "id,name,address,district,province,price_note,phone,line_id,website_url,google_place_id,created_at,updated_at,is_active,latitude:lat,longitude:lng,court_photos(image_url,is_primary)",
    sport_id: `eq.${sportRow.id}`,
    is_active: "eq.true",
    order: "created_at.desc",
  };

  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.offset) {
    params.offset = String(filters.offset);
  }
  if (filters.province?.trim()) {
    params.province = `eq.${filters.province.trim()}`;
  }
  if (filters.search) {
    const clause = buildSearchClause(filters.search);
    if (clause) {
      params.or = clause;
    }
  }

  const [courtsRes, provinces] = await Promise.all([
    supabaseSelect<CourtRecord>("courts", params),
    fetchCourtFilters(sportRow.id),
  ]);

  return {
    sport: sportRow,
    courts: courtsRes.data ?? [],
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
      sports?: { code: string } | null;
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

export async function fetchCourtDetail(courtId: string) {
  const { data: courts } = await supabaseSelect<CourtRecord>("courts", {
    select:
      "id,name,address,district,province,price_note,opening_hours,phone,line_id,line_qr_url,website_url,google_place_id,created_at,updated_at,is_active,sport_id,created_by,latitude:lat,longitude:lng",
    id: `eq.${courtId}`,
    limit: "1",
  });

  const court = courts?.[0];
  if (!court) {
    return null;
  }

  const [{ data: sportRows }, { data: photos }, { data: groupLinks }] =
    await Promise.all([
      supabaseSelect<SportRow>("sports", {
        select: "id,code,name",
        id: `eq.${court.sport_id}`,
        limit: "1",
      }),
      supabaseSelect<CourtPhoto>("court_photos", {
        select: "id,image_url,is_primary",
        court_id: `eq.${courtId}`,
        order: "is_primary.desc,created_at.asc",
        limit: "12",
      }),
      supabaseSelect<CourtGroupLink>("court_groups", {
        select:
          "id,verification_status,verified_by,verified_at,note,groups(id,name,description,sports(code),group_photos(image_url,is_primary),group_sessions(court_id,day,start_time,end_time))",
        court_id: `eq.${courtId}`,
        order: "created_at.desc",
      }),
    ]);

  const sport = sportRows?.[0];
  return {
    court,
    sport,
    photos: photos ?? [],
    groups: groupLinks ?? [],
  };
}
