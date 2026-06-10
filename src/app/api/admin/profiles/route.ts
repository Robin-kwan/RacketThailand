import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApiAccess } from "@/server/adminApi";

function escapeLikePattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function formatProfileLabel(profile: {
  id: string;
  username: string | null;
  display_name: string | null;
}) {
  const username = profile.username?.trim();
  const displayName = profile.display_name?.trim();
  if (username && displayName) {
    return `${username} - ${displayName}`;
  }
  return username ?? displayName ?? profile.id.slice(0, 8);
}

export async function GET(request: Request) {
  const { error } = await requireAdminApiAccess();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search")?.trim() ?? "";
  const adminSupabase = getSupabaseAdminClient();
  let profileQuery = adminSupabase
    .from("profiles")
    .select("id,username,display_name")
    .order("username", { ascending: true, nullsFirst: false })
    .limit(12);

  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    profileQuery = profileQuery.or(
      `username.ilike.${pattern},display_name.ilike.${pattern}`,
    );
  }

  const { data, error: queryError } = await profileQuery;

  if (queryError) {
    return NextResponse.json(
      { error: queryError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    profiles:
      data?.map((profile) => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        label: formatProfileLabel(profile),
      })) ?? [],
  });
}
