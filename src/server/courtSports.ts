import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSelect } from "@/lib/supabaseRest";

type CourtSportRow = {
  court_id: string;
  sport_id: string;
};

function isMissingCourtSportsTable(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("court_sports") &&
    (error.message.includes("404") ||
      error.message.includes("PGRST205") ||
      error.message.includes("Could not find the table"))
  );
}

export function normalizeSportIds(
  primarySportId: unknown,
  sportIds: unknown,
) {
  const values = [
    ...(typeof primarySportId === "string" ? [primarySportId] : []),
    ...(Array.isArray(sportIds) ? sportIds : []),
  ];
  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

export async function fetchCourtIdsBySportId(sportId: string) {
  try {
    const { data } = await supabaseSelect<CourtSportRow>(
      "court_sports",
      {
        select: "court_id,sport_id",
        sport_id: `eq.${sportId}`,
      },
      { preferCount: false },
    );
    return data.map((row) => row.court_id);
  } catch (error) {
    if (isMissingCourtSportsTable(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchSportIdsByCourtId(courtId: string) {
  try {
    const { data } = await supabaseSelect<CourtSportRow>(
      "court_sports",
      {
        select: "court_id,sport_id",
        court_id: `eq.${courtId}`,
        order: "created_at.asc,sport_id.asc",
      },
      { preferCount: false },
    );
    return data.map((row) => row.sport_id);
  } catch (error) {
    if (isMissingCourtSportsTable(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchSportIdsByCourtIds(courtIds: string[]) {
  if (courtIds.length === 0) {
    return new Map<string, string[]>();
  }
  try {
    const { data } = await supabaseSelect<CourtSportRow>(
      "court_sports",
      {
        select: "court_id,sport_id",
        court_id: `in.(${courtIds.join(",")})`,
        order: "created_at.asc,sport_id.asc",
      },
      { preferCount: false },
    );
    return data.reduce((acc, row) => {
      const current = acc.get(row.court_id) ?? [];
      current.push(row.sport_id);
      acc.set(row.court_id, current);
      return acc;
    }, new Map<string, string[]>());
  } catch (error) {
    if (isMissingCourtSportsTable(error)) {
      return new Map<string, string[]>();
    }
    throw error;
  }
}

export async function syncCourtSports(
  supabase: SupabaseClient,
  courtId: string,
  sportIds: string[],
) {
  const uniqueSportIds = Array.from(new Set(sportIds.map((id) => id.trim())))
    .filter(Boolean);

  const { error: deleteError } = await supabase
    .from("court_sports")
    .delete()
    .eq("court_id", courtId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (uniqueSportIds.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from("court_sports").insert(
    uniqueSportIds.map((sportId) => ({
      court_id: courtId,
      sport_id: sportId,
    })),
  );

  return { error: insertError };
}
