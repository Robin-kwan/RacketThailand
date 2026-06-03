import { NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { syncCourtGroupLinks } from "@/server/groupSessions";
import { fetchGroupsBySport } from "@/server/groupFinder";
import { ensureUserProfile } from "@/server/profile";

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
  courtIds?: string[];
  sessions?: SessionPayload[];
  playFormat?: string | null;
  playerAmount?: number | string;
  allowWalkIn?: boolean | null;
  phone?: string | null;
  lineId?: string | null;
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
  const search = searchParams.get("search") ?? undefined;
  const day = searchParams.get("day") ?? undefined;
  const playFormat = searchParams.get("playFormat") ?? undefined;
  const allowWalkIn = searchParams.get("allowWalkIn") ?? undefined;
  const locale = normalizeLocale(searchParams.get("lang"));

  try {
    const result = await fetchGroupsBySport(sport, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
      search,
      day,
      playFormat,
      allowWalkIn,
    }, locale);
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

function normalizeCourtIds(courtIds?: unknown) {
  if (!Array.isArray(courtIds)) return [];
  return Array.from(
    new Set(
      courtIds
        .filter((courtId): courtId is string => typeof courtId === "string")
        .map((courtId) => courtId.trim())
        .filter(Boolean),
    ),
  );
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

function normalizePlayerAmount(value?: number | string | null) {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return null;
}

function normalizeContact(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePlayFormat(value?: string | null) {
  return value === "single" || value === "double" ? value : "double";
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
  const linkedCourtIds = Array.from(
    new Set([
      ...normalizeCourtIds(payload.courtIds),
      ...normalizedSessions.map((session) => session.courtId),
    ]),
  );
  const normalizedPlayerAmount = normalizePlayerAmount(
    payload.playerAmount,
  );
  const normalizedPlayFormat = normalizePlayFormat(payload.playFormat);
  const normalizedPhone = normalizeContact(payload.phone);
  const normalizedLine = normalizeContact(payload.lineId);

  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  const { data: insertedGroup, error: insertGroupError } = await adminSupabase
    .from("groups")
    .insert({
      sport_id: payload.sportId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
      play_format: normalizedPlayFormat,
      player_amount: normalizedPlayerAmount,
      allow_walk_in: payload.allowWalkIn !== false,
      phone: normalizedPhone,
      line_id: normalizedLine,
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

  if (normalizedSessions.length > 0) {
    const { error: sessionsError } = await adminSupabase
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

  await syncCourtGroupLinks(adminSupabase, groupId, linkedCourtIds, user.id);

  return NextResponse.json({ ok: true, groupId });
}
