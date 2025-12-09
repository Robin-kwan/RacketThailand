import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  id: string;
};

type UpdatePayload = {
  status: "pending" | "verified" | "rejected";
  note?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as UpdatePayload;
  if (!payload.status) {
    return NextResponse.json(
      { error: "Missing verification status." },
      { status: 400 },
    );
  }

  if (!["pending", "verified", "rejected"].includes(payload.status)) {
    return NextResponse.json(
      { error: "Invalid verification status." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.status === "admin";

  const { data: link, error: linkError } = await supabase
    .from("court_groups")
    .select("id,court_id")
    .eq("id", resolvedParams.id)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "Court link not found." }, { status: 404 });
  }

  let canManage = isAdmin;
  if (!canManage) {
    const { data: court } = await supabase
      .from("courts")
      .select("created_by")
      .eq("id", link.court_id)
      .single();
    canManage = court?.created_by === user.id;
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timestamp =
    payload.status === "pending" ? null : new Date().toISOString();
  const note = payload.note?.trim() || null;

  const { error: updateError } = await supabase
    .from("court_groups")
    .update({
      verification_status: payload.status,
      note,
      verified_by: timestamp ? user.id : null,
      verified_at: timestamp,
    })
    .eq("id", resolvedParams.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
