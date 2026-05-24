import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import {
  buildDuplicateCourtMessage,
  findCourtByGooglePlaceId,
} from "@/server/courtDuplicate";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeSportIds, syncCourtSports } from "@/server/courtSports";

type CourtPayload = {
  sportId: string;
  sportIds?: string[];
  name: string;
  description?: string;
  address: string;
  district?: string;
  province: string;
  provinceId: number;
  districtId: number;
  price_note?: string;
  opening_hours?: OpeningHoursEntry[] | null;
  phone?: string;
  line_id?: string;
  lineQrUrl?: string | null;
  website_url?: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string | null;
};

async function requireCourtManager() {
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
  const isAllowed =
    profile?.status === "admin" || profile?.status === "court_manager";
  if (!isAllowed) {
    return { supabase, user, error: "FORBIDDEN" };
  }
  return { supabase, user, error: null };
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireCourtManager();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json()) as CourtPayload;
  const sportIds = normalizeSportIds(payload.sportId, payload.sportIds);
  const sportId = sportIds[0] ?? "";
  if (
    !sportId ||
    !payload.name ||
    typeof payload.provinceId !== "number" ||
    typeof payload.districtId !== "number" ||
    typeof payload.latitude !== "number" ||
    typeof payload.longitude !== "number" ||
    Number.isNaN(payload.latitude) ||
    Number.isNaN(payload.longitude)
  ) {
    return NextResponse.json(
      { error: "Missing required court fields." },
      { status: 400 },
    );
  }
  const duplicateCourt = await findCourtByGooglePlaceId(payload.googlePlaceId);
  if (duplicateCourt) {
    return NextResponse.json(
      { error: buildDuplicateCourtMessage(duplicateCourt) },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("courts")
    .insert({
      name: payload.name,
      description: payload.description?.trim() || null,
      address: payload.address,
      district: payload.district || null,
      province: payload.province,
      province_id: payload.provinceId,
      district_id: payload.districtId,
      price_note: payload.price_note || null,
      opening_hours: payload.opening_hours ?? null,
      phone: payload.phone || null,
      line_id: payload.line_id || null,
      line_qr_url: payload.lineQrUrl ?? null,
      website_url: payload.website_url || null,
      lat: payload.latitude,
      lng: payload.longitude,
      google_place_id: payload.googlePlaceId ?? null,
      is_active: true,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  const { error: sportSyncError } = await syncCourtSports(
    getSupabaseAdminClient(),
    inserted.id,
    sportIds,
  );
  if (sportSyncError) {
    return NextResponse.json(
      { error: sportSyncError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, courtId: inserted.id });
}
