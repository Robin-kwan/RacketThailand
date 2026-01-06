import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";

type CourtPayload = {
  sportId: string;
  name: string;
  address: string;
  district?: string;
  province: string;
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
  if (
    !payload.sportId ||
    !payload.name ||
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

  const { data: inserted, error: insertError } = await supabase
    .from("courts")
    .insert({
      sport_id: payload.sportId,
      name: payload.name,
      address: payload.address,
      district: payload.district || null,
      province: payload.province,
      price_note: payload.price_note || null,
      opening_hours: payload.opening_hours ?? null,
      phone: payload.phone || null,
      line_id: payload.line_id || null,
      line_qr_url: payload.lineQrUrl ?? null,
      website_url: payload.website_url || null,
      lat: payload.latitude,
      lng: payload.longitude,
      google_place_id: payload.googlePlaceId ?? null,
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

  return NextResponse.json({ ok: true, courtId: inserted.id });
}
