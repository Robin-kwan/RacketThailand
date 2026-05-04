import { NextResponse } from "next/server";
import { isCasualPlayExpired } from "@/lib/casual-play";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireCasualPlayAccess } from "@/server/casualPlayAccess";
import {
  type CasualPlayPayloadInput,
  validateCasualPlayPayload,
} from "@/server/casualPlayValidation";

type RouteParams = { playId: string };
type RouteParamsInput = Promise<RouteParams>;

async function resolveParams(
  params: RouteParamsInput,
): Promise<RouteParams> {
  return params;
}

export async function PATCH(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { error } = await requireCasualPlayAccess(resolved.playId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { data: existingPlay, error: playError } = await adminSupabase
    .from("casual_plays")
    .select("id,play_date")
    .eq("id", resolved.playId)
    .single();

  if (playError || !existingPlay) {
    return NextResponse.json(
      { error: "Casual play not found." },
      { status: 404 },
    );
  }

  if (isCasualPlayExpired(existingPlay.play_date)) {
    return NextResponse.json(
      { error: "Expired casual plays can no longer be updated." },
      { status: 400 },
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

  const { error: updateError } = await adminSupabase
    .from("casual_plays")
    .update({
      sport_id: normalized.sportId,
      court_id: normalized.courtId,
      venue_name: normalized.venueName,
      location_note: normalized.locationNote,
      title: normalized.title,
      description: normalized.description,
      play_date: normalized.playDate,
      start_time: normalized.startTime,
      end_time: normalized.endTime,
      player_amount: normalized.playerAmount,
      phone: normalized.phone,
      line_id: normalized.lineId,
      allow_public_contact: normalized.allowPublicContact,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolved.playId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
