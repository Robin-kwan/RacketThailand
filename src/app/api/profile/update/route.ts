import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureUserProfile } from "@/server/profile";

type UpdatePayload = {
  display_name?: string;
  username?: string;
  location?: string | null;
  default_sport?: string | null;
  avatar_url?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as UpdatePayload;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: userError?.message ?? "Not authenticated" },
      { status: 401 },
    );
  }
  const { error: profileError } = await ensureUserProfile(
    getSupabaseAdminClient(),
    user,
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const sanitizedUsername = body.username
    ? body.username.trim().toLowerCase()
    : undefined;

  if (sanitizedUsername) {
    const { data: conflict, error: conflictError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", sanitizedUsername)
      .neq("id", user.id)
      .maybeSingle();
    if (conflictError && conflictError.code !== "PGRST116") {
      return NextResponse.json(
        { error: conflictError.message },
        { status: 500 },
      );
    }
    if (conflict) {
      return NextResponse.json(
        { error: "USERNAME_TAKEN" },
        { status: 409 },
      );
    }
  }

  const updates: Record<string, string | null> = {};
  if (body.display_name !== undefined) {
    updates.display_name = body.display_name.trim();
  }
  if (sanitizedUsername !== undefined) {
    updates.username = sanitizedUsername;
  }
  if (body.location !== undefined) {
    updates.location = body.location?.trim() || null;
  }
  if (body.default_sport !== undefined) {
    updates.default_sport = body.default_sport || null;
  }
  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
  }
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, display_name, username, location, default_sport, avatar_url")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
