import { NextResponse } from "next/server";
import { syncCourtGroupLinks } from "@/server/groupSessions";
import { requireGroupAccess } from "@/server/groupAccess";
import { deleteGroupWithAssets } from "@/server/adminDeletion";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
  courtIds?: string[];
  sessions?: SessionPayload[];
  playFormat?: string | null;
  playerAmount?: number | string | null;
  allowWalkIn?: boolean | null;
  phone?: string | null;
  lineId?: string | null;
  lineQrUrl?: string | null;
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

function normalizePlayFormat(value?: string | null) {
  return value === "single" || value === "double" ? value : "double";
}

export async function PATCH(
  request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { user, error } = await requireGroupAccess(
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
  if (payload.playFormat !== undefined) {
    update.play_format = normalizePlayFormat(payload.playFormat);
  }
  if (payload.playerAmount !== undefined) {
    update.player_amount = normalizePlayerAmount(payload.playerAmount);
  }
  if (payload.allowWalkIn !== undefined) {
    update.allow_walk_in = payload.allowWalkIn !== false;
  }
  if (payload.phone !== undefined) {
    update.phone = normalizeContact(payload.phone);
  }
  if (payload.lineId !== undefined) {
    update.line_id = normalizeContact(payload.lineId);
  }
  if (payload.lineQrUrl !== undefined) {
    if (
      typeof payload.lineQrUrl === "string" &&
      payload.lineQrUrl.trim().length > 0
    ) {
      update.line_qr_url = payload.lineQrUrl.trim();
    } else {
      update.line_qr_url = null;
    }
  }

  const normalizedSessions = normalizeSessions(payload.sessions);
  const linkedCourtIds = Array.from(
    new Set([
      ...normalizeCourtIds(payload.courtIds),
      ...normalizedSessions.map((session) => session.courtId),
    ]),
  );
  const adminSupabase = getSupabaseAdminClient();
  const hasSessionPayload = Array.isArray(payload.sessions);
  const hasCourtPayload = Array.isArray(payload.courtIds);
  const shouldUpdateGroup = Object.keys(update).length > 0;

  if (!shouldUpdateGroup && !hasSessionPayload && !hasCourtPayload) {
    return NextResponse.json(
      { error: "No changes submitted." },
      { status: 400 },
    );
  }
  if (shouldUpdateGroup) {
    update.updated_at = new Date().toISOString();

    const { error: updateError } = await adminSupabase
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
    const { error: deleteError } = await adminSupabase
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
      const { error: insertError } = await adminSupabase
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

  if (hasCourtPayload || hasSessionPayload) {
    await syncCourtGroupLinks(
      adminSupabase,
      resolved.groupId,
      linkedCourtIds,
      user.id,
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
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

  const result = await deleteGroupWithAssets(resolved.groupId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
