import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireCourtAccess(courtId: string) {
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
  const isAdmin = profile?.status === "admin";

  if (isAdmin) {
    return { supabase, user, error: null };
  }

  const { data: court } = await supabase
    .from("courts")
    .select("created_by")
    .eq("id", courtId)
    .single();
  if (court?.created_by !== user.id) {
    return { supabase, user, error: "FORBIDDEN" as const };
  }

  return { supabase, user, error: null };
}
