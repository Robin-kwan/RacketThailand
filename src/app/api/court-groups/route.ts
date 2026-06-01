import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireGroupAccess } from "@/server/groupAccess";

type CourtGroupPayload = {
  courtId: string;
  groupId: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as CourtGroupPayload;
  if (!payload.courtId || !payload.groupId) {
    return NextResponse.json(
      { error: "Missing courtId or groupId" },
      { status: 400 },
    );
  }

  const { error: accessError } = await requireGroupAccess(payload.groupId);
  if (accessError === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (accessError === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: inserted, error: insertError } = await adminSupabase
    .from("court_groups")
    .insert({
      court_id: payload.courtId,
      group_id: payload.groupId,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This group has already been submitted for this court." },
        { status: 409 },
      );
    }
    const message =
      insertError.message ??
      "Unable to submit court verification request right now.";
    const status = message.includes("row-level security") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const [{ data: court }, { data: group }] = await Promise.all([
    adminSupabase
      .from("courts")
      .select("id,name,created_by")
      .eq("id", payload.courtId)
      .single(),
    adminSupabase
      .from("groups")
      .select("name")
      .eq("id", payload.groupId)
      .single(),
  ]);

  if (court?.created_by) {
    const message =
      group?.name && court.name
        ? `${group.name} requested verification for ${court.name}`
        : "New group verification request";
    try {
      await adminSupabase.from("notifications").insert({
        recipient_id: court.created_by,
        type: "court-group-request",
        message,
        metadata: {
          courtId: payload.courtId,
          courtName: court.name,
          groupId: payload.groupId,
          groupName: group?.name ?? null,
        },
      });
    } catch {
      // Swallow notification errors so they don't block the request
    }
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
