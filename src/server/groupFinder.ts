import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchSportRow } from "@/server/courtFinder";

export type GroupPhoto = {
  image_url: string | null;
  is_primary: boolean | null;
};

export type GroupSessionRecord = {
  day: string;
  start_time: string | null;
  end_time: string | null;
  courts?: {
    id: string;
    name: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
    district?: string | null;
  } | null;
};

export type GroupRecord = {
  id: string;
  name: string | null;
  description: string | null;
  updated_at: string | null;
  play_format?: "single" | "double" | null;
  player_amount?: number | null;
  allow_walk_in?: boolean | null;
  phone?: string | null;
  line_id?: string | null;
  group_photos?: GroupPhoto[] | null;
  group_sessions?: GroupSessionRecord[] | null;
};

export type GroupFilterOptions = {
  search?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  playFormat?: string;
  allowWalkIn?: string;
  limit?: number;
  offset?: number;
};

function buildSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(name.ilike.${term},description.ilike.${term})`;
}

function buildCourtLocationSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(name.ilike.${term},address.ilike.${term},district.ilike.${term},province.ilike.${term})`;
}

async function fetchCourtIdsByLocationSearch(
  sportId: string,
  query: string,
) {
  const locationClause = buildCourtLocationSearchClause(query);
  if (!locationClause) {
    return [];
  }

  const { data } = await supabaseSelect<{ id: string }>(
    "courts",
    {
      select: "id",
      sport_id: `eq.${sportId}`,
      is_active: "eq.true",
      or: locationClause,
      limit: "100",
    },
    { preferCount: false },
  );

  return data?.map((court) => court.id) ?? [];
}

async function fetchGroupIdsByCourtIds(
  courtIds: string[],
  filters: GroupFilterOptions,
) {
  if (courtIds.length === 0) {
    return [];
  }

  const params: Record<string, string> = {
    select: "group_id",
    court_id: `in.(${courtIds.join(",")})`,
    limit: "500",
  };

  if (filters.day) {
    params.day = `eq.${filters.day}`;
  }
  if (filters.startTime && filters.endTime) {
    params.start_time = `lte.${filters.endTime}`;
    params.end_time = `gte.${filters.startTime}`;
  } else if (filters.startTime) {
    params.end_time = `gte.${filters.startTime}`;
  } else if (filters.endTime) {
    params.start_time = `lte.${filters.endTime}`;
  }

  const { data } = await supabaseSelect<{ group_id: string }>(
    "group_sessions",
    params,
    { preferCount: false },
  );

  return Array.from(new Set(data?.map((session) => session.group_id) ?? []));
}

export async function fetchGroupsBySport(
  sportCode: string,
  filters: GroupFilterOptions = {},
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { sport: null, groups: [], count: 0 };
  }

  const hasSessionFilter =
    Boolean(filters.day) ||
    Boolean(filters.startTime) ||
    Boolean(filters.endTime);
  const sessionRelation = hasSessionFilter
    ? "group_sessions!inner"
    : "group_sessions";

  const params: Record<string, string> = {
    select:
      `id,name,description,updated_at,play_format,player_amount,allow_walk_in,phone,line_id,group_photos(image_url,is_primary),${sessionRelation}(day,start_time,end_time,court_id,courts(id,name,province,latitude:lat,longitude:lng,district))`,
    sport_id: `eq.${sportRow.id}`,
    order: "updated_at.desc.nullslast",
  };

  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.offset) {
    params.offset = String(filters.offset);
  }
  if (filters.search) {
    const clause = buildSearchClause(filters.search);
    if (clause) {
      const courtIds = await fetchCourtIdsByLocationSearch(
        sportRow.id,
        filters.search,
      );
      const groupIds = await fetchGroupIdsByCourtIds(courtIds, filters);
      if (groupIds.length > 0) {
        params.or = clause.replace(/\)$/, `,id.in.(${groupIds.join(",")}))`);
      } else {
        params.or = clause;
      }
    }
  }
  if (filters.playFormat === "single" || filters.playFormat === "double") {
    params.play_format = `eq.${filters.playFormat}`;
  }
  if (filters.allowWalkIn === "true" || filters.allowWalkIn === "false") {
    params.allow_walk_in = `eq.${filters.allowWalkIn}`;
  }
  if (filters.day) {
    params["group_sessions.day"] = `eq.${filters.day}`;
  }
  if (filters.startTime && filters.endTime) {
    params["group_sessions.start_time"] = `lte.${filters.endTime}`;
    params["group_sessions.end_time"] = `gte.${filters.startTime}`;
  } else if (filters.startTime) {
    params["group_sessions.end_time"] = `gte.${filters.startTime}`;
  } else if (filters.endTime) {
    params["group_sessions.start_time"] = `lte.${filters.endTime}`;
  }

  const groupsRes = await supabaseSelect<GroupRecord>("groups", params);

  return {
    sport: sportRow,
    groups: groupsRes.data ?? [],
    count: groupsRes.count ?? 0,
  };
}
