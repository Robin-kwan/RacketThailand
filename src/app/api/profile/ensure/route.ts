import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildProfileDefaults } from "@/server/profile";

export async function POST() {
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

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 },
    );
  }

  if (existingProfile) {
    return NextResponse.json({ created: false });
  }

  const defaults = buildProfileDefaults(user);
  const { error: insertError } = await supabase.from("profiles").insert(defaults);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ created: true });
}
