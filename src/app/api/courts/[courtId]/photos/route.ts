import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireCourtAccess } from "@/server/courtAccess";

const COURT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images";

type RouteParams = { courtId: string };

async function resolveParams(params: Promise<RouteParams>) {
  return params;
}

export async function POST(
  request: Request,
  options: { params: Promise<RouteParams> },
) {
  const resolved = await resolveParams(options.params);
  const { error } = await requireCourtAccess(resolved.courtId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const isPrimary = formData.get("isPrimary") === "true";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Court photo is required." },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${resolved.courtId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const adminClient = getSupabaseAdminClient();

  const { error: uploadError } = await adminClient.storage
    .from(COURT_BUCKET)
    .upload(filePath, fileBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 400 },
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from(COURT_BUCKET).getPublicUrl(filePath);

  const { data: inserted, error: insertError } = await adminClient
    .from("court_photos")
    .insert({
      court_id: resolved.courtId,
      image_url: publicUrl,
      is_primary: isPrimary,
    })
    .select("id,image_url,is_primary")
    .single();

  if (insertError) {
    await adminClient.storage.from(COURT_BUCKET).remove([filePath]);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, photo: inserted });
}
