import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteParams = Promise<{ invitationId: string }>;
type UpdatePayload = { action?: "accept" | "decline" | "cancel" };

export async function PATCH(
  request: Request,
  { params }: { params: RouteParams },
) {
  const { invitationId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdatePayload;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: invitation } = await adminSupabase
    .from("player_group_invitations")
    .select("id,recipient_id,invited_by,status,groups(id,name)")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "This invitation has already been updated." },
      { status: 409 },
    );
  }

  const recipientAction = body.action === "accept" || body.action === "decline";
  const senderAction = body.action === "cancel";
  if (
    (recipientAction && invitation.recipient_id !== user.id) ||
    (senderAction && invitation.invited_by !== user.id) ||
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
    .from("player_group_invitations")
    .update({ status, responded_at: now, updated_at: now })
    .eq("id", invitationId)
    .eq("status", "pending");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (recipientAction) {
    const groupRelation = Array.isArray(invitation.groups)
      ? invitation.groups[0]
      : invitation.groups;
    await adminSupabase.from("notifications").insert({
      recipient_id: invitation.invited_by,
      type: `player-group-invitation-${status}`,
      message:
        status === "accepted"
          ? `A player accepted the invitation to ${groupRelation?.name ?? "your group"}.`
          : `A player declined the invitation to ${groupRelation?.name ?? "your group"}.`,
      metadata: {
        invitationId,
        groupId: groupRelation?.id ?? null,
        groupName: groupRelation?.name ?? null,
        recipientId: invitation.recipient_id,
      },
    });
  }

  return NextResponse.json({ ok: true, status });
}
