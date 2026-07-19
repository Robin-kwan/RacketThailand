import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteParams = Promise<{ requestId: string }>;
type UpdatePayload = { action?: "accept" | "decline" | "cancel" };

export async function PATCH(
  request: Request,
  { params }: { params: RouteParams },
) {
  const { requestId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdatePayload;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: playRequest } = await adminSupabase
    .from("player_play_requests")
    .select("id,sender_id,recipient_id,status,sports(code,name)")
    .eq("id", requestId)
    .maybeSingle();
  if (!playRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (playRequest.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been updated." },
      { status: 409 },
    );
  }

  const recipientAction = body.action === "accept" || body.action === "decline";
  const senderAction = body.action === "cancel";
  if (
    (recipientAction && playRequest.recipient_id !== user.id) ||
    (senderAction && playRequest.sender_id !== user.id) ||
    (!recipientAction && !senderAction)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status =
    body.action === "accept"
      ? "accepted"
      : body.action === "decline"
        ? "declined"
        : "cancelled";
  const now = new Date().toISOString();
  const { error } = await adminSupabase
    .from("player_play_requests")
    .update({ status, responded_at: now, updated_at: now })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (recipientAction) {
    const sportRelation = Array.isArray(playRequest.sports)
      ? playRequest.sports[0]
      : playRequest.sports;
    await adminSupabase.from("notifications").insert({
      recipient_id: playRequest.sender_id,
      type: `player-play-request-${status}`,
      message:
        status === "accepted"
          ? "Your play request was accepted."
          : "Your play request was declined.",
      metadata: {
        requestId,
        recipientId: playRequest.recipient_id,
        sportCode: sportRelation?.code ?? null,
        sportName: sportRelation?.name ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true, status });
}

