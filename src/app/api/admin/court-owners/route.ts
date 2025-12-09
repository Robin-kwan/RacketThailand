import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AssignmentPayload = {
  courtId: string;
  profileId: string;
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
  if (!payload.courtId || !payload.profileId) {
    return NextResponse.json(
      { error: "Missing courtId or profileId" },
      { status: 400 },
    );
  }
  const { error: updateError } = await supabase
    .from("courts")
    .update({
      created_by: payload.profileId,
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
