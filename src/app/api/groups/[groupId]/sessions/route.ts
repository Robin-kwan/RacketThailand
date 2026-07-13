import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireGroupAccess } from "@/server/groupAccess";
import { syncCourtGroupLinks } from "@/server/groupSessions";
import { validateCourtIdsForSport } from "@/server/groupCourtValidation";
import { normalizeGroupEvents } from "@/server/groupEvents";

type RouteParams = { groupId: string };
type RouteParamsInput = Promise<RouteParams>;

type SessionCreatePayload = {
  mode?: "weekly" | "date";
  courtId?: string | null;
  day?: string | null;
  date?: string | null;
  start?: string | null;
  end?: string | null;
  notes?: string | null;
};

type SessionUpdatePayload = {
  mode?: "weekly" | "date";
  eventId?: string | null;
  sessionId?: string | null;
  courtId?: string | null;
  day?: string | null;
  date?: string | null;
  start?: string | null;
  end?: string | null;
  notes?: string | null;
  sessions?: {
    id?: string | null;
    day?: string | null;
    start?: string | null;
    end?: string | null;
  }[] | null;
};

type SessionDeletePayload = {
  mode?: "date" | "weekly" | "court";
  eventId?: string | null;
  sessionId?: string | null;
  courtId?: string | null;
};

const VALID_DAYS = new Set([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

async function resolveParams(params: RouteParamsInput): Promise<RouteParams> {
  return params;
}

function normalizeText(value?: string | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeWeeklySessions(payload: SessionUpdatePayload["sessions"]) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return [];
  }

  return payload.map((session) => ({
    day: normalizeText(session.day),
    start: normalizeText(session.start),
    end: normalizeText(session.end),
  }));
}

function getThailandDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-");
}

async function getGroupCourtIds(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  groupId: string,
  extraCourtId?: string | null,
) {
  const [
    { data: sessions },
    { data: links },
  ] = await Promise.all([
    supabase
      .from("group_sessions")
      .select("court_id")
      .eq("group_id", groupId),
    supabase
      .from("court_groups")
      .select("court_id")
      .eq("group_id", groupId),
  ]);

  return Array.from(
    new Set(
      [
        ...(sessions ?? []).map((row) => row.court_id),
        ...(links ?? []).map((row) => row.court_id),
        extraCourtId,
      ]
        .filter((courtId): courtId is string => Boolean(courtId))
        .map((courtId) => courtId.trim())
        .filter(Boolean),
    ),
  );
}

export async function POST(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { user, error } = await requireGroupAccess(resolved.groupId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as SessionCreatePayload;
  const adminSupabase = getSupabaseAdminClient();
  const { data: group, error: groupError } = await adminSupabase
    .from("groups")
    .select("sport_id")
    .eq("id", resolved.groupId)
    .single();

  if (groupError || !group?.sport_id) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const mode = payload.mode === "date" ? "date" : "weekly";
  const courtId = normalizeText(payload.courtId);
  const start = normalizeText(payload.start);
  const end = normalizeText(payload.end);

  if (!courtId) {
    return NextResponse.json(
      { error: "Court is required." },
      { status: 400 },
    );
  }

  const courtSportValidation = await validateCourtIdsForSport(
    adminSupabase,
    group.sport_id,
    [courtId],
  );
  if (courtSportValidation.error) {
    return NextResponse.json(
      { error: courtSportValidation.error.message },
      { status: 500 },
    );
  }
  if (courtSportValidation.invalidCourtIds.length > 0) {
    return NextResponse.json(
      {
        code: "INVALID_COURT_SPORT",
        error: "Selected court must support this group sport.",
      },
      { status: 400 },
    );
  }

  if (mode === "weekly") {
    const day = normalizeText(payload.day);
    if (!VALID_DAYS.has(day) || !isTime(start) || !isTime(end)) {
      return NextResponse.json(
        { error: "Court, day, start time, and end time are required." },
        { status: 400 },
      );
    }

    const { error: insertError } = await adminSupabase
      .from("group_sessions")
      .insert({
        group_id: resolved.groupId,
        court_id: courtId,
        day,
        start_time: start,
        end_time: end,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    const courtIds = await getGroupCourtIds(
      adminSupabase,
      resolved.groupId,
      courtId,
    );
    await syncCourtGroupLinks(
      adminSupabase,
      resolved.groupId,
      courtIds,
      user.id,
    );

    return NextResponse.json({ ok: true });
  }

  const date = normalizeText(payload.date);
  const today = getThailandDateKey(0);
  const maxDate = getThailandDateKey(30);

  if (!date || date < today || date > maxDate) {
    return NextResponse.json(
      {
        code: "DATE_OUT_OF_RANGE",
        error: "Specific-date sessions must be within the next 30 days.",
      },
      { status: 400 },
    );
  }

  const normalizedEvents = normalizeGroupEvents([
    {
      courtId,
      venueName: null,
      date,
      start,
      end,
      notes: payload.notes,
    },
  ]);
  const event = normalizedEvents[0];

  if (!event) {
    return NextResponse.json(
      {
        error: "Court, date, and start time are required.",
      },
      { status: 400 },
    );
  }

  const { error: insertError } = await adminSupabase
    .from("group_events")
    .insert({
      group_id: resolved.groupId,
      court_id: event.courtId,
      venue_name: event.venueName,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      notes: event.notes,
      created_by: user.id,
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { user, error } = await requireGroupAccess(resolved.groupId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as SessionUpdatePayload;
  const adminSupabase = getSupabaseAdminClient();
  const { data: group, error: groupError } = await adminSupabase
    .from("groups")
    .select("sport_id")
    .eq("id", resolved.groupId)
    .single();

  if (groupError || !group?.sport_id) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  if (payload.mode === "date") {
    const eventId = normalizeText(payload.eventId);
    const courtId = normalizeText(payload.courtId);
    const date = normalizeText(payload.date);
    const start = normalizeText(payload.start);
    const end = normalizeText(payload.end);
    const today = getThailandDateKey(0);
    const maxDate = getThailandDateKey(30);

    if (!eventId || !courtId) {
      return NextResponse.json(
        { error: "Event and court are required." },
        { status: 400 },
      );
    }

    if (!date || date < today || date > maxDate) {
      return NextResponse.json(
        {
          code: "DATE_OUT_OF_RANGE",
          error: "Specific-date sessions must be within the next 30 days.",
        },
        { status: 400 },
      );
    }

    const courtSportValidation = await validateCourtIdsForSport(
      adminSupabase,
      group.sport_id,
      [courtId],
    );
    if (courtSportValidation.error) {
      return NextResponse.json(
        { error: courtSportValidation.error.message },
        { status: 500 },
      );
    }
    if (courtSportValidation.invalidCourtIds.length > 0) {
      return NextResponse.json(
        {
          code: "INVALID_COURT_SPORT",
          error: "Selected court must support this group sport.",
        },
        { status: 400 },
      );
    }

    const normalizedEvents = normalizeGroupEvents([
      {
        courtId,
        venueName: null,
        date,
        start,
        end,
        notes: payload.notes,
      },
    ]);
    const event = normalizedEvents[0];

    if (!event) {
      return NextResponse.json(
        {
          error: "Court, date, and start time are required.",
        },
        { status: 400 },
      );
    }

    const { data: existingEvent, error: existingEventError } =
      await adminSupabase
        .from("group_events")
        .select("id")
        .eq("id", eventId)
        .eq("group_id", resolved.groupId)
        .single();

    if (existingEventError || !existingEvent) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    const { error: updateError } = await adminSupabase
      .from("group_events")
      .update({
        court_id: event.courtId,
        venue_name: event.venueName,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        notes: event.notes,
      })
      .eq("id", eventId)
      .eq("group_id", resolved.groupId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.mode === "weekly" && payload.sessionId) {
    const sessionId = normalizeText(payload.sessionId);
    const day = normalizeText(payload.day);
    const start = normalizeText(payload.start);
    const end = normalizeText(payload.end);

    if (!sessionId || !VALID_DAYS.has(day) || !isTime(start) || !isTime(end)) {
      return NextResponse.json(
        { error: "Day, start time, and end time are required." },
        { status: 400 },
      );
    }

    const { data: existingSession, error: existingSessionError } =
      await adminSupabase
        .from("group_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("group_id", resolved.groupId)
        .single();

    if (existingSessionError || !existingSession) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    const { error: updateError } = await adminSupabase
      .from("group_sessions")
      .update({ day, start_time: start, end_time: end })
      .eq("id", sessionId)
      .eq("group_id", resolved.groupId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  const courtId = normalizeText(payload.courtId);
  const sessions = normalizeWeeklySessions(payload.sessions);

  if (!courtId) {
    return NextResponse.json(
      { error: "Court is required." },
      { status: 400 },
    );
  }

  const hasInvalidSession = sessions.some(
    (session) =>
      !VALID_DAYS.has(session.day) ||
      !isTime(session.start) ||
      !isTime(session.end),
  );

  if (hasInvalidSession) {
    return NextResponse.json(
      { error: "Day, start time, and end time are required." },
      { status: 400 },
    );
  }

  const courtSportValidation = await validateCourtIdsForSport(
    adminSupabase,
    group.sport_id,
    [courtId],
  );
  if (courtSportValidation.error) {
    return NextResponse.json(
      { error: courtSportValidation.error.message },
      { status: 500 },
    );
  }
  if (courtSportValidation.invalidCourtIds.length > 0) {
    return NextResponse.json(
      {
        code: "INVALID_COURT_SPORT",
        error: "Selected court must support this group sport.",
      },
      { status: 400 },
    );
  }

  const { error: deleteError } = await adminSupabase
    .from("group_sessions")
    .delete()
    .eq("group_id", resolved.groupId)
    .eq("court_id", courtId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  if (sessions.length > 0) {
    const { error: insertError } = await adminSupabase
      .from("group_sessions")
      .insert(
        sessions.map((session) => ({
          group_id: resolved.groupId,
          court_id: courtId,
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

  const courtIds = await getGroupCourtIds(
    adminSupabase,
    resolved.groupId,
    courtId,
  );
  await syncCourtGroupLinks(
    adminSupabase,
    resolved.groupId,
    courtIds,
    user.id,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { user, error } = await requireGroupAccess(resolved.groupId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as SessionDeletePayload;
  const adminSupabase = getSupabaseAdminClient();

  if (payload.mode === "date") {
    const eventId = normalizeText(payload.eventId);
    if (!eventId) {
      return NextResponse.json(
        { error: "Session is required." },
        { status: 400 },
      );
    }

    const { data: existingEvent, error: existingEventError } =
      await adminSupabase
        .from("group_events")
        .select("id")
        .eq("id", eventId)
        .eq("group_id", resolved.groupId)
        .single();

    if (existingEventError || !existingEvent) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await adminSupabase
      .from("group_events")
      .delete()
      .eq("id", eventId)
      .eq("group_id", resolved.groupId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.mode === "weekly") {
    const sessionId = normalizeText(payload.sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session is required." },
        { status: 400 },
      );
    }

    const { data: existingSession, error: existingSessionError } =
      await adminSupabase
        .from("group_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("group_id", resolved.groupId)
        .single();

    if (existingSessionError || !existingSession) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await adminSupabase
      .from("group_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("group_id", resolved.groupId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.mode === "court") {
    const courtId = normalizeText(payload.courtId);
    if (!courtId) {
      return NextResponse.json(
        { error: "Court is required." },
        { status: 400 },
      );
    }

    const { data: weeklySessions, error: weeklySessionsError } =
      await adminSupabase
        .from("group_sessions")
        .select("id")
        .eq("group_id", resolved.groupId)
        .eq("court_id", courtId)
        .limit(1);

    if (weeklySessionsError) {
      return NextResponse.json(
        { error: weeklySessionsError.message },
        { status: 500 },
      );
    }

    if ((weeklySessions ?? []).length > 0) {
      return NextResponse.json(
        { error: "Remove this court's weekly sessions first." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await adminSupabase
      .from("court_groups")
      .delete()
      .eq("group_id", resolved.groupId)
      .eq("court_id", courtId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Unsupported delete action." },
    { status: 400 },
  );
}
