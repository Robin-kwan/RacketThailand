import { NextResponse } from "next/server";
import {
  fetchCourtsBySport,
  type CourtFilterOptions,
} from "@/server/courtFinder";
import { getAllowPublicCourtPublish } from "@/lib/court-submission-policy";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import { ensureUserProfile } from "@/server/profile";
import {
  buildDuplicateCourtMessage,
  findCourtByGooglePlaceId,
} from "@/server/courtDuplicate";
import { normalizeSportIds, syncCourtSports } from "@/server/courtSports";
import { normalizeLocale } from "@/lib/i18n";

type CourtCreatePayload = {
  sportId?: string;
  sportIds?: string[];
  name?: string;
  description?: string;
  address?: string;
  district?: string;
  province?: string;
  provinceId?: number;
  districtId?: number;
  price_note?: string;
  opening_hours?: OpeningHoursEntry[] | null;
  phone?: string;
  line_id?: string;
  lineQrUrl?: string | null;
  website_url?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string | null;
};

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");

  if (!sport) {
    return NextResponse.json(
      { error: "Missing sport parameter." },
      { status: 400 },
    );
  }

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const nearbyLat = Number(searchParams.get("nearbyLat"));
  const nearbyLng = Number(searchParams.get("nearbyLng"));
  const locale = normalizeLocale(searchParams.get("lang"));
  const filters: CourtFilterOptions = {
    search: searchParams.get("search") ?? undefined,
    province: searchParams.get("province") ?? undefined,
    startTime: searchParams.get("startTime") ?? undefined,
    endTime: searchParams.get("endTime") ?? undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
    offset:
      Number.isFinite(page) && page > 1 ? (page - 1) * (limit || 12) : 0,
    includeProvinces: searchParams.get("includeProvinces") !== "false",
    nearby:
      Number.isFinite(nearbyLat) && Number.isFinite(nearbyLng)
        ? {
            latitude: nearbyLat,
            longitude: nearbyLng,
          }
        : undefined,
  };

  try {
    const result = await fetchCourtsBySport(sport, filters, locale);
    if (!result.sport) {
      return NextResponse.json({ courts: [], count: 0, provinces: [] });
    }
    return NextResponse.json({
      courts: result.courts,
      count: result.count,
      provinces: result.provinces,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CourtCreatePayload;
  try {
    payload = (await request.json()) as CourtCreatePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const sportIds = normalizeSportIds(payload.sportId, payload.sportIds);
  const sportId = sportIds[0] ?? "";
  const name = sanitizeText(payload.name);
  const description = sanitizeText(payload.description);
  const address = sanitizeText(payload.address);
  const district = sanitizeText(payload.district);
  const province = sanitizeText(payload.province);
  const priceNote = sanitizeText(payload.price_note);
  const phone = sanitizeText(payload.phone);
  const lineId = sanitizeText(payload.line_id);
  const website = sanitizeText(payload.website_url);
  const googlePlaceId = sanitizeText(payload.googlePlaceId);
  const provinceId =
    typeof payload.provinceId === "number" ? payload.provinceId : Number.NaN;
  const districtId =
    typeof payload.districtId === "number" ? payload.districtId : Number.NaN;
  const latitude =
    typeof payload.latitude === "number" ? payload.latitude : Number.NaN;
  const longitude =
    typeof payload.longitude === "number" ? payload.longitude : Number.NaN;

  if (
    !sportId ||
    !name ||
    !address ||
    !province ||
    Number.isNaN(provinceId) ||
    Number.isNaN(districtId) ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return NextResponse.json(
      { error: "Missing required court fields." },
      { status: 400 },
    );
  }

  const openingHours = Array.isArray(payload.opening_hours)
    ? payload.opening_hours
    : null;
  const allowPublicCourtPublish = await getAllowPublicCourtPublish();
  const adminClient = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminClient, user);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }
  const duplicateCourt = await findCourtByGooglePlaceId(googlePlaceId);
  if (duplicateCourt) {
    return NextResponse.json(
      { error: buildDuplicateCourtMessage(duplicateCourt) },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("courts")
    .insert({
      name,
      description: description || null,
      address,
      district: district || null,
      province,
      province_id: provinceId,
      district_id: districtId,
      price_note: priceNote || null,
      opening_hours: openingHours,
      phone: phone || null,
      line_id: lineId || null,
      line_qr_url: payload.lineQrUrl ?? null,
      website_url: website || null,
      lat: latitude,
      lng: longitude,
      google_place_id: googlePlaceId || null,
      is_active: allowPublicCourtPublish,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Unable to create court." },
      { status: 500 },
    );
  }

  const { error: sportSyncError } = await syncCourtSports(
    adminClient,
    inserted.id,
    sportIds,
  );
  if (sportSyncError) {
    return NextResponse.json(
      { error: sportSyncError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    courtId: inserted.id,
    requiresApproval: !allowPublicCourtPublish,
  });
}
