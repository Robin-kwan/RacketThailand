import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeOptionalPlayerText } from "@/lib/player-finder";
import { ensureUserProfile } from "@/server/profile";

type PlayRequestPayload = {
  recipientId?: unknown;
  sportId?: unknown;
  message?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PlayRequestPayload;
  const recipientId = normalizeOptionalPlayerText(body.recipientId, 80);
  const sportId = normalizeOptionalPlayerText(body.sportId, 80);
  const message = normalizeOptionalPlayerText(body.message, 500);
  if (!recipientId || !sportId) {
    return NextResponse.json(
      { error: "Recipient and sport are required." },
      { status: 400 },
    );
  }
  if (recipientId === user.id) {
    return NextResponse.json(
      { error: "You cannot send a play request to yourself." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const [{ data: senderSport }, { data: recipientSport }, { data: sport }] =
    await Promise.all([
      adminSupabase
        .from("profile_sports")
        .select("profile_id")
        .eq("profile_id", user.id)
        .eq("sport_id", sportId)
        .maybeSingle(),
      adminSupabase
        .from("profile_sports")
        .select("profile_id,looking_until")
        .eq("profile_id", recipientId)
        .eq("sport_id", sportId)
        .gt("looking_until", now)
        .maybeSingle(),
      adminSupabase
        .from("sports")
        .select("id,code,name")
        .eq("id", sportId)
        .maybeSingle(),
    ]);

  if (!senderSport) {
    return NextResponse.json(
      { error: "Create your sport profile before sending a request." },
      { status: 409 },
    );
  }
  if (!recipientSport || !sport) {
    return NextResponse.json(
      { error: "This player is no longer looking to play." },
      { status: 409 },
    );
  }

  const { data: existing } = await adminSupabase
    .from("player_play_requests")
    .select("id")
    .eq("sport_id", sportId)
    .eq("sender_id", user.id)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You already sent this player a request." },
      { status: 409 },
    );
  }

  const { data: saved, error } = await adminSupabase
    .from("player_play_requests")
    .insert({
      sport_id: sportId,
      sender_id: user.id,
      recipient_id: recipientId,
      message,
      status: "pending",
      updated_at: now,
    })
    .select("id,status")
    .single();

  if (error || !saved) {
    const schemaMissing = error?.code === "42P01";
    return NextResponse.json(
      { error: schemaMissing ? "PLAYER_FINDER_SCHEMA_REQUIRED" : error?.message },
      { status: schemaMissing ? 503 : 500 },
    );
  }

  const { data: senderProfile } = await adminSupabase
    .from("profiles")
    .select("display_name,username")
    .eq("id", user.id)
    .single();
  const senderName =
    senderProfile?.display_name ?? senderProfile?.username ?? "A player";
  await adminSupabase.from("notifications").insert({
    recipient_id: recipientId,
    type: "player-play-request",
    message: `${senderName} wants to play ${sport.name ?? sport.code} with you.`,
    metadata: {
      requestId: saved.id,
      senderId: user.id,
      senderName,
      sportCode: sport.code,
      sportName: sport.name,
    },
  });

  return NextResponse.json({ request: saved });
}

