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
  courts?: { id: string; name: string | null; province: string | null } | null;
};

export type GroupRecord = {
  id: string;
  name: string | null;
  description: string | null;
  is_public: boolean | null;
  updated_at: string | null;
  group_photos?: GroupPhoto[] | null;
  group_sessions?: GroupSessionRecord[] | null;
};

export type GroupFilterOptions = {
  search?: string;
  visibility?: "public" | "private";
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

  const params: Record<string, string> = {
    select:
      "id,name,description,is_public,updated_at,group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,court_id,courts(id,name,province))",
    sport_id: `eq.${sportRow.id}`,
    order: "updated_at.desc.nullslast",
  };

  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.offset) {
    params.offset = String(filters.offset);
  }
  if (filters.visibility === "public") {
    params.is_public = "eq.true";
  }
  if (filters.visibility === "private") {
    params.is_public = "eq.false";
  }
  if (filters.search) {
    const clause = buildSearchClause(filters.search);
    if (clause) {
      params.or = clause;
    }
  }

  const groupsRes = await supabaseSelect<GroupRecord>("groups", params);

  return {
    sport: sportRow,
    groups: groupsRes.data ?? [],
    count: groupsRes.count ?? 0,
  };
}
