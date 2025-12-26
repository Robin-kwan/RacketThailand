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
  player_amount?: number | null;
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
  limit?: number;
  offset?: number;
};

function buildSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(name.ilike.${term},description.ilike.${term})`;
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
      `id,name,description,updated_at,player_amount,phone,line_id,group_photos(image_url,is_primary),${sessionRelation}(day,start_time,end_time,court_id,courts(id,name,province,latitude:lat,longitude:lng,district))`,
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
      params.or = clause;
    }
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
