import { type User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RequireCasualPlayAccessResult = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  error: "UNAUTHORIZED" | "FORBIDDEN" | null;
};

export async function requireCasualPlayAccess(
  playId: string,
): Promise<RequireCasualPlayAccessResult> {
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

  if (profile?.status === "admin") {
    return { supabase, user, error: null };
  }

  const { data: play } = await supabase
    .from("casual_plays")
    .select("owner_id")
    .eq("id", playId)
    .single();

  if (play?.owner_id !== user.id) {
    return { supabase, user: null, error: "FORBIDDEN" };
  }

  return { supabase, user, error: null };
}
