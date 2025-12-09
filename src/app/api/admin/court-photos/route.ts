import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PhotoPayload = {
  courtId: string;
  imageUrl: string;
  isPrimary?: boolean;
};

async function requireCourtPermission(courtId: string) {
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

export async function POST(request: Request) {
  const payload = (await request.json()) as PhotoPayload;
  if (!payload.courtId || !payload.imageUrl) {
    return NextResponse.json(
      { error: "Missing courtId or imageUrl" },
      { status: 400 },
    );
  }
  const { supabase, error } = await requireCourtPermission(payload.courtId);
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("court_photos")
    .insert({
      court_id: payload.courtId,
      image_url: payload.imageUrl,
      is_primary: payload.isPrimary ?? false,
    })
    .select("id,image_url,is_primary")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, photo: inserted });
}
