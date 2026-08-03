import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureUserProfile } from "@/server/profile";
import { fetchSportIdsByCourtId } from "@/server/courtSports";
import {
  validateTournamentPayload,
  type TournamentPayloadInput,
} from "@/server/tournamentValidation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: TournamentPayloadInput;
  try {
    payload = (await request.json()) as TournamentPayloadInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const validation = validateTournamentPayload(payload);
  if (!validation.ok)
    return NextResponse.json({ error: validation.error }, { status: 400 });
  const value = validation.value;
  const admin = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(admin, user);
  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: selectedCourt, error: courtError } = await admin
    .from("courts")
    .select("id")
    .eq("id", value.courtId)
    .eq("is_active", true)
    .maybeSingle();
  if (courtError)
    return NextResponse.json({ error: courtError.message }, { status: 500 });
  if (!selectedCourt)
    return NextResponse.json(
      { error: "Selected court is unavailable." },
      { status: 400 },
    );

  const courtSports = await fetchSportIdsByCourtId(value.courtId);
  if (!courtSports.includes(value.sportId))
    return NextResponse.json(
      { error: "Selected court does not support this sport." },
      { status: 400 },
    );

  const submittedGroupIds = Array.from(
    new Set(
      value.organizers
        .map((organizer) => organizer.groupId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (submittedGroupIds.length) {
    const { data: matchingGroups, error: groupsLookupError } = await admin
      .from("groups")
      .select("id")
      .eq("sport_id", value.sportId)
      .eq("status", "published")
      .in("id", submittedGroupIds);
    if (groupsLookupError) {
      return NextResponse.json(
        { error: groupsLookupError.message },
        { status: 500 },
      );
    }
    if ((matchingGroups ?? []).length !== submittedGroupIds.length) {
      return NextResponse.json(
        {
          error:
            "Selected groups must be published and support the tournament sport.",
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
  const { data: tournamentId, error: createError } = await admin.rpc(
    "create_tournament_with_organizers",
    {
      p_owner_id: user.id,
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
  if (createError || !tournamentId) {
    return NextResponse.json(
      { error: createError?.message ?? "Unable to create tournament." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tournamentId,
    status: "draft",
  });
}
