import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteParams = {
  playId: string;
  requestId: string;
};
type RouteParamsInput = Promise<RouteParams>;

type UpdatePayload = {
  action?: "accept" | "reject";
};

function getMaxPlayers(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

async function resolveParams(params: RouteParamsInput) {
  return params;
}

export async function PATCH(
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

  const payload = (await request.json().catch(() => ({}))) as UpdatePayload;
  if (payload.action !== "accept" && payload.action !== "reject") {
    return NextResponse.json(
      { error: "Action must be accept or reject." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const [{ data: profile }, { data: play, error: playError }] =
    await Promise.all([
      adminSupabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single(),
      adminSupabase
        .from("casual_plays")
        .select("id,title,owner_id,player_amount")
        .eq("id", resolved.playId)
        .single(),
    ]);

  if (playError || !play) {
    return NextResponse.json(
      { error: "Casual play not found." },
      { status: 404 },
    );
  }

  const isAdmin = profile?.status === "admin";
  if (!isAdmin && play.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: joinRequest, error: requestError } = await adminSupabase
    .from("casual_play_join_requests")
    .select("id,requester_id,status")
    .eq("id", resolved.requestId)
    .eq("play_id", resolved.playId)
    .single();

  if (requestError || !joinRequest) {
    return NextResponse.json(
      { error: "Join request not found." },
      { status: 404 },
    );
  }

  const nextStatus = payload.action === "accept" ? "accepted" : "rejected";
  const maxPlayers = getMaxPlayers(play.player_amount);
  if (
    nextStatus === "accepted" &&
    joinRequest.status !== "accepted" &&
    maxPlayers !== null
  ) {
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

  const timestamp = new Date().toISOString();
  const { error: updateError } = await adminSupabase
    .from("casual_play_join_requests")
    .update({
      status: nextStatus,
      responded_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", resolved.requestId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  await adminSupabase.from("notifications").insert({
    recipient_id: joinRequest.requester_id,
    type:
      nextStatus === "accepted"
        ? "casual-play-join-accepted"
        : "casual-play-join-rejected",
    message:
      nextStatus === "accepted"
        ? `Your request to join ${play.title ?? "a casual play"} was accepted.`
        : `Your request to join ${play.title ?? "a casual play"} was declined.`,
    metadata: {
      playId: resolved.playId,
      playTitle: play.title ?? null,
      requestId: resolved.requestId,
      status: nextStatus,
    },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
