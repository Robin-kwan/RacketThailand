import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  courtId: string;
};

type Payload = {
  action?: "publish" | "reject";
};

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, error: "UNAUTHORIZED" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "admin") {
    return { supabase, error: "FORBIDDEN" as const };
  }

  return { supabase, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const resolvedParams = await params;
  const { supabase, error } = await requireAdmin();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.action !== "publish" && payload.action !== "reject") {
    return NextResponse.json(
      { error: "Action must be either publish or reject." },
      { status: 400 },
    );
  }

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id,is_active")
    .eq("id", resolvedParams.courtId)
    .single();

  if (courtError || !court) {
    return NextResponse.json({ error: "Court not found." }, { status: 404 });
  }

  const isActive = court.is_active === true;

  if (payload.action === "publish") {
    if (isActive) {
      return NextResponse.json({ ok: true, status: "already_published" });
    }

    const { error: publishError } = await supabase
      .from("courts")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedParams.courtId);

    if (publishError) {
      return NextResponse.json(
        { error: publishError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: "published" });
  }

  if (isActive) {
    return NextResponse.json(
      { error: "Only pending requests can be rejected." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabase
    .from("courts")
    .delete()
    .eq("id", resolvedParams.courtId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: "rejected" });
}
