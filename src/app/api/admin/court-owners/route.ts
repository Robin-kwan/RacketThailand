import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AssignmentPayload = {
  courtId: string;
  profileId?: string | null;
};

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null, error: "UNAUTHORIZED" };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "admin") {
    return { supabase, user, error: "FORBIDDEN" };
  }
  return { supabase, user, error: null };
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const payload = (await request.json()) as AssignmentPayload;
  if (!payload.courtId) {
    return NextResponse.json(
      { error: "Missing courtId" },
      { status: 400 },
    );
  }
  const profileId =
    typeof payload.profileId === "string" && payload.profileId.trim().length > 0
      ? payload.profileId.trim()
      : null;
  const { error: updateError } = await supabase
    .from("courts")
    .update({
      created_by: profileId,
    })
    .eq("id", payload.courtId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
