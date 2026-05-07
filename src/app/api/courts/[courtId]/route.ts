import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import { deleteCourtWithAssets } from "@/server/adminDeletion";

type CourtPayload = Partial<{
  sportId: string;
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
  if (payload.sportId !== undefined) {
    update.sport_id = payload.sportId;
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
    update.google_place_id = payload.googlePlaceId ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

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
