import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteParams = { groupId: string };
type RouteParamsInput = Promise<RouteParams>;

async function resolveParams(
  params: RouteParamsInput,
): Promise<RouteParams> {
  return params;
}

type SessionPayload = {
  courtId?: string;
  day?: string;
  start?: string;
  end?: string;
};

type PatchGroupPayload = {
  sportId?: string;
  name?: string;
  description?: string;
  sessions?: SessionPayload[];
  isPublic?: boolean;
};

function normalizeSessions(sessions?: SessionPayload[]) {
  if (!Array.isArray(sessions)) return [];
  return sessions
    .map((session) => ({
      courtId: typeof session.courtId === "string" ? session.courtId : "",
      day: typeof session.day === "string" ? session.day : "",
      start: typeof session.start === "string" ? session.start : "",
      end: typeof session.end === "string" ? session.end : "",
    }))
    .filter(
      (session) =>
        session.courtId && session.day && session.start && session.end,
    );
}

async function requireGroupAccess(groupId: string) {
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
  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();
  if (group?.owner_id !== user.id) {
    return { supabase, user, error: "FORBIDDEN" };
  }
  return { supabase, user, error: null };
}

export async function PATCH(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { supabase, user, error } = await requireGroupAccess(
    resolved.groupId,
  );
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json()) as PatchGroupPayload;
  const update: Record<string, unknown> = {};
  if (payload.sportId) {
    update.sport_id = payload.sportId;
  }
  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Group name is required." },
        { status: 400 },
      );
    }
    update.name = trimmed;
  }
  if (payload.description !== undefined) {
    update.description = payload.description.trim()
      ? payload.description.trim()
      : null;
  }
  if (typeof payload.isPublic === "boolean") {
    update.is_public = payload.isPublic;
  }

  const normalizedSessions = normalizeSessions(payload.sessions);
  const hasSessionPayload = Array.isArray(payload.sessions);
  const shouldUpdateGroup = Object.keys(update).length > 0;

  if (!shouldUpdateGroup && !hasSessionPayload) {
    return NextResponse.json(
      { error: "No changes submitted." },
      { status: 400 },
    );
  }
  if (shouldUpdateGroup) {
    update.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("groups")
      .update(update)
      .eq("id", resolved.groupId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  if (hasSessionPayload) {
    const { error: deleteError } = await supabase
      .from("group_sessions")
      .delete()
      .eq("group_id", resolved.groupId);
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }
    if (normalizedSessions.length > 0) {
      const { error: insertError } = await supabase
        .from("group_sessions")
        .insert(
          normalizedSessions.map((session) => ({
            group_id: resolved.groupId,
            court_id: session.courtId,
            day: session.day,
            start_time: session.start,
            end_time: session.end,
          })),
        );
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
