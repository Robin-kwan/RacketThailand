import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { fetchCasualPlaysBySport } from "@/server/casualPlays";
import {
  type CasualPlayPayloadInput,
  validateCasualPlayPayload,
} from "@/server/casualPlayValidation";
import { ensureUserProfile } from "@/server/profile";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  if (!sport) {
    return NextResponse.json(
      { error: "Missing sport parameter." },
      { status: 400 },
    );
  }

  const playDate = searchParams.get("date")?.trim() || undefined;
  if (playDate && !DATE_PATTERN.test(playDate)) {
    return NextResponse.json(
      { error: "Date filter must use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = Number(searchParams.get("offset") ?? "0");
  const search = searchParams.get("q") ?? undefined;

  try {
    const result = await fetchCasualPlaysBySport(sport, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
      search,
      playDate,
    });

    if (!result.sport) {
      return NextResponse.json(
        { plays: [], count: 0, sport: null },
        { status: 404 },
      );
    }

    return NextResponse.json({
      plays: result.plays,
      count: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load casual plays.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CasualPlayPayloadInput;
  const validation = validateCasualPlayPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const normalized = validation.value;
  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  if (normalized.courtId) {
    const { data: court, error: courtError } = await adminSupabase
      .from("courts")
      .select("id,sport_id")
      .eq("id", normalized.courtId)
      .single();

    if (courtError || !court || court.sport_id !== normalized.sportId) {
      return NextResponse.json(
        { error: "Selected court does not match the chosen sport." },
        { status: 400 },
      );
    }
  }

  const { data: insertedPlay, error: insertError } = await adminSupabase
    .from("casual_plays")
    .insert({
      sport_id: normalized.sportId,
      court_id: normalized.courtId,
      venue_name: normalized.venueName,
      location_note: normalized.locationNote,
      owner_id: user.id,
      title: normalized.title,
      description: normalized.description,
      play_date: normalized.playDate,
      start_time: normalized.startTime,
      end_time: normalized.endTime,
      play_format: normalized.playFormat,
      player_amount: normalized.playerAmount,
      phone: normalized.phone,
      line_id: normalized.lineId,
      allow_public_contact: normalized.allowPublicContact,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !insertedPlay) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create casual play." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, playId: insertedPlay.id });
}
