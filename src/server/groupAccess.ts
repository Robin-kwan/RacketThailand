import { type User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RequireGroupAccessResult = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  error: "UNAUTHORIZED" | "FORBIDDEN" | null;
};

export async function requireGroupAccess(
  groupId: string,
): Promise<RequireGroupAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: "UNAUTHORIZED" };
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "admin") {
    return { supabase, user, error: null };
  }

  const { data: group } = await adminSupabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (group?.owner_id !== user.id) {
    return { supabase, user: null, error: "FORBIDDEN" };
  }

  return { supabase, user, error: null };
}
