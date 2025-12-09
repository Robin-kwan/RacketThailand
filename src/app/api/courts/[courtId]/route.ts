import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type CourtPayload = {
  sportId: string;
  name: string;
  address: string;
  district?: string;
  province: string;
  price_note?: string;
  opening_hours?: string;
  phone?: string;
  line_id?: string;
  website_url?: string;
};

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

async function resolveParams(
  params: RouteParams | Promise<RouteParams>,
): Promise<RouteParams> {
  if (typeof (params as Promise<RouteParams>).then === "function") {
    return params as Promise<RouteParams>;
  }
  return params as RouteParams;
}

export async function PATCH(
  request: Request,
  options: { params: RouteParams | Promise<RouteParams> },
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
  if (!payload.sportId || !payload.name) {
    return NextResponse.json(
      { error: "Missing required court fields." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("courts")
    .update({
      sport_id: payload.sportId,
      name: payload.name,
      address: payload.address,
      district: payload.district || null,
      province: payload.province,
      price_note: payload.price_note || null,
      opening_hours: payload.opening_hours || null,
      phone: payload.phone || null,
      line_id: payload.line_id || null,
      website_url: payload.website_url || null,
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
