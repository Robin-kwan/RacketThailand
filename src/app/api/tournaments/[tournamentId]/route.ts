import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchSportIdsByCourtId } from "@/server/courtSports";
import {
  isValidTournamentUuid,
  type TournamentPayloadInput,
  validateTournamentPayload,
} from "@/server/tournamentValidation";

type RouteParams = Promise<{ tournamentId: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: RouteParams },
) {
  const { tournamentId } = await params;
  if (!isValidTournamentUuid(tournamentId)) {
    return NextResponse.json(
      { error: "Tournament identifier is invalid." },
      { status: 400 },
    );
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const [tournamentResult, profileResult] = await Promise.all([
    admin
      .from("tournaments")
      .select("id,owner_id")
      .eq("id", tournamentId)
      .maybeSingle(),
    admin.from("profiles").select("status").eq("id", user.id).maybeSingle(),
  ]);
  if (tournamentResult.error || profileResult.error) {
    return NextResponse.json(
      { error: "Unable to verify tournament access." },
      { status: 500 },
    );
  }
  const tournament = tournamentResult.data;
  const profile = profileResult.data;
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
  }
  if (tournament.owner_id !== user.id && profile?.status !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: TournamentPayloadInput;
  try {
    payload = (await request.json()) as TournamentPayloadInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const validation = validateTournamentPayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const value = validation.value;

  const { data: selectedCourt, error: courtError } = await admin
    .from("courts")
    .select("id")
    .eq("id", value.courtId)
    .eq("is_active", true)
    .maybeSingle();
  if (courtError) {
    return NextResponse.json({ error: courtError.message }, { status: 500 });
  }
  if (!selectedCourt) {
    return NextResponse.json(
      { error: "Selected court is unavailable." },
      { status: 400 },
    );
  }

  const courtSports = await fetchSportIdsByCourtId(value.courtId);
  if (!courtSports.includes(value.sportId)) {
    return NextResponse.json(
      { error: "Selected court does not support this sport." },
      { status: 400 },
    );
  }

  const organizerGroupIds = Array.from(
    new Set(
      value.organizers
        .map((organizer) => organizer.groupId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (organizerGroupIds.length) {
    const { data: groups, error: groupsError } = await admin
      .from("groups")
      .select("id")
      .eq("sport_id", value.sportId)
      .eq("status", "published")
      .in("id", organizerGroupIds);
    if (groupsError) {
      return NextResponse.json({ error: groupsError.message }, { status: 500 });
    }
    if ((groups ?? []).length !== organizerGroupIds.length) {
      return NextResponse.json(
        {
          error:
            "Organizer groups must be published and support the tournament sport.",
        },
        { status: 400 },
      );
    }
  }

  const organizerRows = value.organizers.map((organizer, index) => ({
    group_id: organizer.groupId,
    organizer_name: organizer.name,
    phone: organizer.phone,
    line_id: organizer.lineId,
    website_url: organizer.websiteUrl,
    display_order: index,
  }));
  const { error: updateError } = await admin.rpc(
    "update_tournament_with_organizers",
    {
      p_tournament_id: tournamentId,
      p_sport_id: value.sportId,
      p_court_id: value.courtId,
      p_name: value.name,
      p_description: value.description,
      p_tournament_start_at: value.tournamentStartAt,
      p_tournament_end_at: value.tournamentEndAt,
      p_registration_url: value.registrationUrl,
      p_phone: value.phone,
      p_line_id: value.lineId,
      p_organizers: organizerRows,
    },
  );
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tournamentId });
}
