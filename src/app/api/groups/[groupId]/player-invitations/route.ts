import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeOptionalPlayerText } from "@/lib/player-finder";
import { requireGroupAccess } from "@/server/groupAccess";

type RouteParams = Promise<{ groupId: string }>;
type InvitePayload = { recipientId?: unknown; message?: unknown };

export async function POST(
  request: Request,
  { params }: { params: RouteParams },
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (access.error === "UNAUTHORIZED" || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (access.error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as InvitePayload;
  const recipientId = normalizeOptionalPlayerText(body.recipientId, 80);
  const message = normalizeOptionalPlayerText(body.message, 500);
  if (!recipientId) {
    return NextResponse.json({ error: "Player is required." }, { status: 400 });
  }
  if (recipientId === access.user.id) {
    return NextResponse.json(
      { error: "You cannot invite yourself." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: group } = await adminSupabase
    .from("groups")
    .select("id,name,sport_id,sports(code,name)")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const { count: recentInviteCount } = await adminSupabase
    .from("player_group_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", access.user.id)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((recentInviteCount ?? 0) >= 20) {
    return NextResponse.json(
      { error: "Daily invitation limit reached." },
      { status: 429 },
    );
  }

  const { data: playerSport } = await adminSupabase
    .from("profile_sports")
    .select("profile_id")
    .eq("profile_id", recipientId)
    .eq("sport_id", group.sport_id)
    .eq("allow_group_invites", true)
    .gt("looking_until", new Date().toISOString())
    .maybeSingle();
  if (!playerSport) {
    return NextResponse.json(
      { error: "This player is not accepting group invitations." },
      { status: 409 },
    );
  }

  const { data: existing } = await adminSupabase
    .from("player_group_invitations")
    .select("id")
    .eq("group_id", groupId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "This player already has a pending invitation." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: invitation, error } = await adminSupabase
    .from("player_group_invitations")
    .insert({
      group_id: groupId,
      recipient_id: recipientId,
      invited_by: access.user.id,
      message,
      status: "pending",
      updated_at: now,
    })
    .select("id,status")
    .single();
  if (error || !invitation) {
    const schemaMissing = error?.code === "42P01";
    return NextResponse.json(
      { error: schemaMissing ? "PLAYER_FINDER_SCHEMA_REQUIRED" : error?.message },
      { status: schemaMissing ? 503 : 500 },
    );
  }

  const sportRelation = Array.isArray(group.sports)
    ? group.sports[0]
    : group.sports;
  await adminSupabase.from("notifications").insert({
    recipient_id: recipientId,
    type: "player-group-invitation",
    message: `${group.name ?? "A group"} invited you to play.`,
    metadata: {
      invitationId: invitation.id,
      groupId,
      groupName: group.name,
      sportCode: sportRelation?.code ?? null,
      sportName: sportRelation?.name ?? null,
    },
  });

  return NextResponse.json({ invitation });
}

