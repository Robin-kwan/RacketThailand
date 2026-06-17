import type { SupabaseClient } from "@supabase/supabase-js";

type CourtSportRow = {
  court_id: string;
};

export async function validateCourtIdsForSport(
  supabase: SupabaseClient,
  sportId: string,
  courtIds: string[],
) {
  const uniqueCourtIds = Array.from(
    new Set(courtIds.map((courtId) => courtId.trim()).filter(Boolean)),
  );

  if (!sportId || uniqueCourtIds.length === 0) {
    return { invalidCourtIds: [], error: null };
  }

  const { data, error } = await supabase
    .from("court_sports")
    .select("court_id")
    .eq("sport_id", sportId)
    .in("court_id", uniqueCourtIds);

  if (error) {
    return { invalidCourtIds: [], error };
  }

  const validCourtIds = new Set(
    (data as CourtSportRow[] | null)?.map((row) => row.court_id) ?? [],
  );
  return {
    invalidCourtIds: uniqueCourtIds.filter(
      (courtId) => !validCourtIds.has(courtId),
    ),
    error: null,
  };
}
