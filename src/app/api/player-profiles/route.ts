import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildActiveLookingUntil,
  isAllowedValue,
  normalizeOptionalPlayerText,
  normalizePlayerDays,
  PLAYER_PLAY_FORMATS,
  PLAYER_SKILL_LEVELS,
  PLAYER_TIME_PREFERENCES,
} from "@/lib/player-finder";
import { ensureUserProfile } from "@/server/profile";

type PlayerProfilePayload = {
  sportId?: unknown;
  skillLevel?: unknown;
  ratingSystem?: unknown;
  ratingValue?: unknown;
  area?: unknown;
  availabilityDays?: unknown;
  timePreference?: unknown;
  playFormat?: unknown;
  lookingNote?: unknown;
  looking?: unknown;
  allowGroupInvites?: unknown;
};

type PlayerProfileStatusPayload = {
  sportId?: unknown;
  active?: unknown;
};

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error || !user || user.is_anonymous ? null : user;
}

function parseRatingValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) return undefined;
  return Math.round(parsed * 100) / 100;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PlayerProfilePayload;
  const sportId = normalizeOptionalPlayerText(body.sportId, 80);
  if (!sportId) {
    return NextResponse.json({ error: "Sport is required." }, { status: 400 });
  }

  const skillLevel = isAllowedValue(PLAYER_SKILL_LEVELS, body.skillLevel)
    ? body.skillLevel
    : null;
  const timePreference = isAllowedValue(
    PLAYER_TIME_PREFERENCES,
    body.timePreference,
  )
    ? body.timePreference
    : null;
  const playFormat = isAllowedValue(PLAYER_PLAY_FORMATS, body.playFormat)
    ? body.playFormat
    : "either";
  const availabilityDays = normalizePlayerDays(body.availabilityDays);
  const area = normalizeOptionalPlayerText(body.area, 120);
  const looking = body.looking === true;
  const ratingValue = parseRatingValue(body.ratingValue);

  if (ratingValue === undefined) {
    return NextResponse.json(
      { error: "Rating must be between 0 and 10." },
      { status: 400 },
    );
  }
  if (looking && !area) {
    return NextResponse.json(
      { error: "Area is required when looking to play." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: sport } = await adminSupabase
    .from("sports")
    .select("id")
    .eq("id", sportId)
    .maybeSingle();
  if (!sport) {
    return NextResponse.json({ error: "Sport not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data, error } = await adminSupabase
    .from("profile_sports")
    .upsert(
      {
        profile_id: user.id,
        sport_id: sportId,
        skill_level: skillLevel,
        rating_system: normalizeOptionalPlayerText(body.ratingSystem, 40),
        rating_value: ratingValue,
        area,
        availability_days: availabilityDays,
        time_preference: timePreference,
        play_format: playFormat,
        looking_note: normalizeOptionalPlayerText(body.lookingNote, 240),
        looking_until: looking ? buildActiveLookingUntil() : null,
        allow_group_invites: body.allowGroupInvites !== false,
        updated_at: now,
      },
      { onConflict: "profile_id,sport_id" },
    )
    .select(
      "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites",
    )
    .single();

  if (error) {
    const schemaMissing =
      error.code === "42703" ||
      error.code === "PGRST204" ||
      error.message.includes("rating_system");
    return NextResponse.json(
      { error: schemaMissing ? "PLAYER_FINDER_SCHEMA_REQUIRED" : error.message },
      { status: schemaMissing ? 503 : 500 },
    );
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PlayerProfileStatusPayload;
  const sportId = normalizeOptionalPlayerText(body.sportId, 80);
  if (!sportId || typeof body.active !== "boolean") {
    return NextResponse.json(
      { error: "Sport and active status are required." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("profile_sports")
    .update({
      looking_until: body.active ? buildActiveLookingUntil() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id)
    .eq("sport_id", sportId)
    .select(
      "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Sport profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}
