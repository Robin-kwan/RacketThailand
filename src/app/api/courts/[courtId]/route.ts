import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import { deleteCourtWithAssets } from "@/server/adminDeletion";
import {
  buildDuplicateCourtMessage,
  findCourtByGooglePlaceId,
} from "@/server/courtDuplicate";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeSportIds, syncCourtSports } from "@/server/courtSports";

type CourtPayload = Partial<{
  sportId: string;
  sportIds: string[];
  name: string;
  description?: string;
  address: string;
  district?: string;
  province: string;
  price_note?: string;
  opening_hours?: OpeningHoursEntry[] | null;
  phone?: string;
  line_id?: string;
  lineQrUrl?: string | null;
  website_url?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string | null;
}>;

async function requireCourtAccess(courtId: string) {
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
    return { supabase, user, error: "FORBIDDEN" };
  }

  return { supabase, user, error: null };
}

type RouteParams = { courtId: string };

async function resolveParams(params: Promise<RouteParams>): Promise<RouteParams> {
  return params;
}

export async function PATCH(
  request: Request,
  options: { params: Promise<RouteParams> },
) {
  const resolved = await resolveParams(options.params);
  const { supabase, user, error } = await requireCourtAccess(resolved.courtId);
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json()) as CourtPayload;
  const update: Record<string, unknown> = {};
  const hasSportUpdate =
    payload.sportId !== undefined || payload.sportIds !== undefined;
  const sportIds = hasSportUpdate
    ? normalizeSportIds(payload.sportId, payload.sportIds)
    : null;
  if (hasSportUpdate) {
    if (!sportIds || sportIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required court fields." },
        { status: 400 },
      );
    }
  }
  if (payload.name !== undefined) {
    update.name = payload.name;
  }
  if (payload.description !== undefined) {
    const description =
      typeof payload.description === "string" ? payload.description.trim() : "";
    update.description = description || null;
  }
  if (payload.address !== undefined) {
    update.address = payload.address;
  }
  if (payload.district !== undefined) {
    update.district = payload.district ?? null;
  }
  if (payload.province !== undefined) {
    update.province = payload.province;
  }
  if (payload.price_note !== undefined) {
    update.price_note = payload.price_note ?? null;
  }
  if (payload.opening_hours !== undefined) {
    update.opening_hours = payload.opening_hours ?? null;
  }
  if (payload.phone !== undefined) {
    update.phone = payload.phone ?? null;
  }
  if (payload.line_id !== undefined) {
    update.line_id = payload.line_id ?? null;
  }
  if (payload.lineQrUrl !== undefined) {
    update.line_qr_url = payload.lineQrUrl ?? null;
  }
  if (payload.website_url !== undefined) {
    update.website_url = payload.website_url ?? null;
  }
  if (payload.latitude !== undefined) {
    update.lat = payload.latitude;
  }
  if (payload.longitude !== undefined) {
    update.lng = payload.longitude;
  }
  if (payload.googlePlaceId !== undefined) {
    const duplicateCourt = await findCourtByGooglePlaceId(
      payload.googlePlaceId,
      resolved.courtId,
    );
    if (duplicateCourt) {
      return NextResponse.json(
        { error: buildDuplicateCourtMessage(duplicateCourt) },
        { status: 409 },
      );
    }
    update.google_place_id = payload.googlePlaceId ?? null;
  }

  if (Object.keys(update).length === 0 && !sportIds) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase
      .from("courts")
      .update({
        ...update,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolved.courtId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  if (sportIds) {
    const { error: sportSyncError } = await syncCourtSports(
      getSupabaseAdminClient(),
      resolved.courtId,
      sportIds,
    );
    if (sportSyncError) {
      return NextResponse.json(
        { error: sportSyncError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  options: { params: Promise<RouteParams> },
) {
  const resolved = await resolveParams(options.params);
  const { user, error } = await requireCourtAccess(resolved.courtId);
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await deleteCourtWithAssets(resolved.courtId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
