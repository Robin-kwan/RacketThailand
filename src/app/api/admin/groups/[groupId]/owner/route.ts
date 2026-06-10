import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApiAccess } from "@/server/adminApi";

type RouteParams = { groupId: string };
type Payload = { profileId?: string };

async function resolveParams(params: Promise<RouteParams>) {
  return params;
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

export async function PATCH(
  request: Request,
  options: { params: Promise<RouteParams> },
) {
  const resolved = await resolveParams(options.params);
  const { error } = await requireAdminApiAccess();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as Payload;
  const profileId =
    typeof payload.profileId === "string" ? payload.profileId.trim() : "";
  if (!profileId) {
    return NextResponse.json(
      { error: "Profile is required." },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("id,username,display_name")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found." },
      { status: 404 },
    );
  }

  const { error: updateError } = await adminSupabase
    .from("groups")
    .update({
      owner_id: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolved.groupId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      label: formatProfileLabel(profile),
    },
  });
}
