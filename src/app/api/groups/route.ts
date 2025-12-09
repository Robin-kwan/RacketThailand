import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchGroupsBySport } from "@/server/groupFinder";

type SessionPayload = {
  courtId: string;
  day: string;
  start: string;
  end: string;
};

type GroupPayload = {
  sportId: string;
  name: string;
  description?: string;
  sessions?: SessionPayload[];
  isPublic?: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  if (!sport) {
    return NextResponse.json(
      { error: "Missing sport parameter." },
      { status: 400 },
    );
  }

  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = Number(searchParams.get("offset") ?? "0");
  const visibilityParam = searchParams.get("visibility");
  const visibility =
    visibilityParam === "public" || visibilityParam === "private"
      ? visibilityParam
      : undefined;
  const search = searchParams.get("q") ?? undefined;

  try {
    const result = await fetchGroupsBySport(sport, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
      search,
      visibility,
    });
    if (!result.sport) {
      return NextResponse.json(
        { groups: [], count: 0, sport: null },
        { status: 404 },
      );
    }
    return NextResponse.json({
      groups: result.groups,
      count: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load groups.",
      },
      { status: 500 },
    );
  }
}

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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as GroupPayload;
  if (!payload.sportId || !payload.name) {
    return NextResponse.json(
      { error: "Missing required group fields." },
      { status: 400 },
    );
  }

  const normalizedSessions = normalizeSessions(payload.sessions);

  const { data: insertedGroup, error: insertGroupError } = await supabase
    .from("groups")
    .insert({
      sport_id: payload.sportId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      owner_id: user.id,
      is_public:
        typeof payload.isPublic === "boolean" ? payload.isPublic : true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertGroupError || !insertedGroup) {
    return NextResponse.json(
      { error: insertGroupError?.message ?? "Failed to create group." },
      { status: 500 },
    );
  }

  const groupId = insertedGroup.id;

  await supabase.from("group_members").upsert(
    {
      group_id: groupId,
      profile_id: user.id,
      role: "owner",
    },
    {
      onConflict: "group_id,profile_id",
    },
  );

  if (normalizedSessions.length > 0) {
    const { error: sessionsError } = await supabase
      .from("group_sessions")
      .insert(
        normalizedSessions.map((session) => ({
          group_id: groupId,
          court_id: session.courtId,
          day: session.day,
          start_time: session.start,
          end_time: session.end,
        })),
      );
    if (sessionsError) {
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, groupId });
}
