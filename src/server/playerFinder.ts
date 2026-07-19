import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type PlayerFinderProfile = {
  profileId: string;
  sportId: string;
  sportCode: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  skillLevel: string | null;
  ratingSystem: string | null;
  ratingValue: number | null;
  area: string | null;
  availabilityDays: string[];
  timePreference: string | null;
  playFormat: string;
  lookingNote: string | null;
  lookingUntil: string | null;
  allowGroupInvites: boolean;
};

type ProfileRelation = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type PlayerSportRow = {
  profile_id: string;
  sport_id: string;
  skill_level: string | null;
  rating_system: string | null;
  rating_value: number | null;
  area: string | null;
  availability_days: string[] | null;
  time_preference: string | null;
  play_format: string | null;
  looking_note: string | null;
  looking_until: string | null;
  allow_group_invites: boolean | null;
  profiles: ProfileRelation | ProfileRelation[] | null;
};

export type PlayerFinderResult = {
  sport: { id: string; code: string; name: string | null } | null;
  players: PlayerFinderProfile[];
  schemaReady: boolean;
};

function getProfileRelation(value: PlayerSportRow["profiles"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function isMissingPlayerFinderSchema(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    Boolean(error.message?.includes("player_play_requests"))
  );
}

export async function fetchActivePlayersBySport(
  sportCode: string,
  filters: { area?: string; skillLevel?: string; limit?: number } = {},
): Promise<PlayerFinderResult> {
  const supabase = getSupabaseAdminClient();
  const { data: sport, error: sportError } = await supabase
    .from("sports")
    .select("id,code,name")
    .eq("code", sportCode)
    .maybeSingle();

  if (sportError || !sport) {
    return { sport: null, players: [], schemaReady: true };
  }

  let query = supabase
    .from("profile_sports")
    .select(
      "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites,profiles!inner(id,display_name,username,avatar_url)",
    )
    .eq("sport_id", sport.id)
    .gt("looking_until", new Date().toISOString())
    .order("looking_until", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 60, 1), 100));

  if (filters.skillLevel) {
    query = query.eq("skill_level", filters.skillLevel);
  }
  if (filters.area) {
    query = query.ilike("area", `%${filters.area.replace(/[%_]/g, "")}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingPlayerFinderSchema(error)) {
      return { sport, players: [], schemaReady: false };
    }
    throw new Error(error.message);
  }

  const players = ((data ?? []) as PlayerSportRow[])
    .map((row) => {
      const profile = getProfileRelation(row.profiles);
      if (!profile) return null;
      return {
        profileId: row.profile_id,
        sportId: row.sport_id,
        sportCode: sport.code,
        displayName:
          profile.display_name ?? profile.username ?? "RacketThailand player",
        username: profile.username,
        avatarUrl: profile.avatar_url,
        skillLevel: row.skill_level,
        ratingSystem: row.rating_system,
        ratingValue: row.rating_value,
        area: row.area,
        availabilityDays: row.availability_days ?? [],
        timePreference: row.time_preference,
        playFormat: row.play_format ?? "either",
        lookingNote: row.looking_note,
        lookingUntil: row.looking_until,
        allowGroupInvites: row.allow_group_invites ?? true,
      } satisfies PlayerFinderProfile;
    })
    .filter((player): player is PlayerFinderProfile => Boolean(player));

  return { sport, players, schemaReady: true };
}

export async function fetchOwnPlayerSportProfile(
  profileId: string,
  sportId: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profile_sports")
    .select(
      "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites",
    )
    .eq("profile_id", profileId)
    .eq("sport_id", sportId)
    .maybeSingle();

  if (error && isMissingPlayerFinderSchema(error)) {
    return { profile: null, schemaReady: false };
  }
  if (error) throw new Error(error.message);
  return { profile: data, schemaReady: true };
}

export { isMissingPlayerFinderSchema };
