import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";

type CourtPayload = Partial<{
  sportId: string;
  name: string;
  address: string;
  district?: string;
  province: string;
  price_note?: string;
  opening_hours?: OpeningHoursEntry[] | null;
  phone?: string;
  line_id?: string;
  website_url?: string;
  latitude?: number;
  longitude?: number;
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
  if (payload.website_url !== undefined) {
    update.website_url = payload.website_url ?? null;
  }
  if (payload.latitude !== undefined) {
    update.latitude = payload.latitude;
  }
  if (payload.longitude !== undefined) {
    update.longitude = payload.longitude;
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
