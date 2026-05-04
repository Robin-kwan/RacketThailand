import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireAdminApiAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: "UNAUTHORIZED" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "admin") {
    return { supabase, user, error: "FORBIDDEN" as const };
  }

  return { supabase, user, error: null };
}
