import { NextResponse } from "next/server";
import { isCasualPlayExpired } from "@/lib/casual-play";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteParams = { playId: string };
type RouteParamsInput = Promise<RouteParams>;

type JoinRequestPayload = {
  contactName?: string | null;
  phone?: string | null;
  lineId?: string | null;
  message?: string | null;
};

function normalizeOptionalText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getMaxPlayers(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

async function resolveParams(params: RouteParamsInput) {
  return params;
}

export async function POST(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as JoinRequestPayload;
  const contactName = normalizeOptionalText(payload.contactName);
  const phone = normalizeOptionalText(payload.phone);
  const lineId = normalizeOptionalText(payload.lineId);
  const message = normalizeOptionalText(payload.message);

  if (!phone && !lineId) {
    return NextResponse.json(
      { error: "Phone or LINE ID is required." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: play, error: playError } = await adminSupabase
    .from("casual_plays")
    .select("id,title,owner_id,play_date,player_amount")
    .eq("id", resolved.playId)
    .single();

  if (playError || !play) {
    return NextResponse.json(
      { error: "Casual play not found." },
      { status: 404 },
    );
  }

  if (isCasualPlayExpired(play.play_date)) {
    return NextResponse.json(
      { error: "Expired casual plays can no longer receive join requests." },
      { status: 400 },
    );
  }

  if (play.owner_id === user.id) {
    return NextResponse.json(
      { error: "Owners cannot request to join their own casual play." },
      { status: 400 },
    );
  }

  const { data: existingRequest, error: existingError } = await adminSupabase
    .from("casual_play_join_requests")
    .select("id,status")
    .eq("play_id", resolved.playId)
    .eq("requester_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (existingRequest?.status === "pending") {
    return NextResponse.json(
      { error: "You already have a pending join request." },
      { status: 409 },
    );
  }

  if (existingRequest?.status === "accepted") {
    return NextResponse.json(
      { error: "Your join request has already been accepted." },
      { status: 409 },
    );
  }

  const maxPlayers = getMaxPlayers(play.player_amount);
  if (maxPlayers !== null) {
    const { count: acceptedCount, error: acceptedCountError } =
      await adminSupabase
        .from("casual_play_join_requests")
        .select("id", { count: "exact", head: true })
        .eq("play_id", resolved.playId)
        .eq("status", "accepted");

    if (acceptedCountError) {
      return NextResponse.json(
        { error: acceptedCountError.message },
        { status: 500 },
      );
    }

    if ((acceptedCount ?? 0) >= maxPlayers) {
      return NextResponse.json(
        { error: "This casual play is full." },
        { status: 409 },
      );
    }
  }

  const requestValues = {
    play_id: resolved.playId,
    requester_id: user.id,
    contact_name: contactName,
    phone,
    line_id: lineId,
    message,
    status: "pending",
    responded_at: null,
    updated_at: new Date().toISOString(),
  };

  const saveQuery = existingRequest
    ? adminSupabase
        .from("casual_play_join_requests")
        .update(requestValues)
        .eq("id", existingRequest.id)
        .select("id,status")
        .single()
    : adminSupabase
        .from("casual_play_join_requests")
        .insert(requestValues)
        .select("id,status")
        .single();

  const { data: savedRequest, error: saveError } = await saveQuery;

  if (saveError || !savedRequest) {
    return NextResponse.json(
      { error: saveError?.message ?? "Unable to create join request." },
      { status: 500 },
    );
  }

  if (play.owner_id) {
    const { data: requesterProfile } = await adminSupabase
      .from("profiles")
      .select("display_name,username")
      .eq("id", user.id)
      .single();
    const requesterName =
      contactName ??
      requesterProfile?.display_name ??
      requesterProfile?.username ??
      "A player";
    await adminSupabase.from("notifications").insert({
      recipient_id: play.owner_id,
      type: "casual-play-join-request",
      message: `${requesterName} requested to join ${play.title ?? "your casual play"}.`,
      metadata: {
        playId: resolved.playId,
        playTitle: play.title ?? null,
        requestId: savedRequest.id,
        requesterId: user.id,
        requesterName,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    request: {
      id: savedRequest.id,
      status: savedRequest.status,
    },
  });
}
