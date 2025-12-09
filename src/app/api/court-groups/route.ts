import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type CourtGroupPayload = {
  courtId: string;
  groupId: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CourtGroupPayload;
  if (!payload.courtId || !payload.groupId) {
    return NextResponse.json(
      { error: "Missing courtId or groupId" },
      { status: 400 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
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
    supabase
      .from("courts")
      .select("id,name,created_by")
      .eq("id", payload.courtId)
      .single(),
    supabase
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
    await supabase
      .from("notifications")
      .insert({
        recipient_id: court.created_by,
        type: "court-group-request",
        message,
        metadata: {
          courtId: payload.courtId,
          courtName: court.name,
          groupId: payload.groupId,
          groupName: group?.name ?? null,
        },
      })
      .select("id")
      .single()
      .catch(() => null);
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
