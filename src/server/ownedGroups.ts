import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { OwnedGroupSummary } from "@/lib/group-contribution";

type OwnedGroupRow = {
  id: string;
  name: string | null;
  sport_id: string;
  status: string | null;
  updated_at: string | null;
  sports: { code: string } | { code: string }[] | null;
};

function getSportCode(sports: OwnedGroupRow["sports"]) {
  if (Array.isArray(sports)) return sports[0]?.code ?? null;
  return sports?.code ?? null;
}

export async function fetchOwnedGroupSummaries(
  userId: string,
  sportCode?: string | null,
): Promise<OwnedGroupSummary[]> {
  let query = getSupabaseAdminClient()
    .from("groups")
    .select("id,name,sport_id,status,updated_at,sports!inner(code)")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (sportCode) {
    query = query.eq("sports.code", sportCode);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Unable to load owned groups for contribution flow.", error);
    return [];
  }

  return ((data ?? []) as OwnedGroupRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    sportCode: getSportCode(row.sports),
    sportId: row.sport_id,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}
