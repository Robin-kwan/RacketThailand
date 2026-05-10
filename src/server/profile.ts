import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export function buildProfileDefaults(user: SupabaseUser) {
  const email = user.email ?? "";
  const baseUsername =
    email.split("@")[0] || `player_${user.id.slice(0, 6)}`;
  const normalizedUsername = baseUsername
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
  const displayName =
    user.user_metadata?.full_name ||
    email ||
    `Player ${user.id.slice(0, 6).toUpperCase()}`;
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  return {
    id: user.id,
    username: normalizedUsername || `player_${user.id.slice(0, 6)}`,
    display_name: displayName,
    location: null,
    default_sport: null,
    avatar_url: avatarUrl,
    status: "member",
  };
}

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: SupabaseUser,
) {
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    return {
      created: false,
      error: selectError,
    };
  }

  if (existingProfile) {
    return {
      created: false,
      error: null,
    };
  }

  const defaults = buildProfileDefaults(user);
  const { error: insertError } = await supabase.from("profiles").insert(defaults);

  return {
    created: !insertError,
    error: insertError,
  };
}
