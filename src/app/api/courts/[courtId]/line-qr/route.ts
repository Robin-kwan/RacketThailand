import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { validateLineQrFile } from "@/lib/image-upload";
import { requireCourtAccess } from "@/server/courtAccess";

const COURT_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_LINE_QR_BUCKET || "court-line-qr";

type RouteParams = { courtId: string };

async function resolveParams(params: Promise<RouteParams>) {
  return params;
}

function extractPathFromUrl(url: string | null) {
  if (!url) return null;
  try {
    const prefix = `/storage/v1/object/public/${COURT_LINE_QR_BUCKET}/`;
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(prefix);
    if (index === -1) return null;
    return parsed.pathname.slice(index + prefix.length);
  } catch {
    return null;
  }
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

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "LINE QR image is required." },
      { status: 400 },
    );
  }
  const validationError = validateLineQrFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const filePath = `${resolved.courtId}/line-qr.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const adminClient = getSupabaseAdminClient();

  const { error: uploadError } = await adminClient.storage
    .from(COURT_LINE_QR_BUCKET)
    .upload(filePath, fileBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/png",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 400 },
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from(COURT_LINE_QR_BUCKET).getPublicUrl(filePath);

  const { error: updateError } = await adminClient
    .from("courts")
    .update({ line_qr_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", resolved.courtId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ lineQrUrl: publicUrl });
}

export async function DELETE(
  _request: Request,
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

  const adminClient = getSupabaseAdminClient();
  const { data: court, error: fetchError } = await adminClient
    .from("courts")
    .select("line_qr_url")
    .eq("id", resolved.courtId)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 },
    );
  }

  const storagePath = extractPathFromUrl(court?.line_qr_url ?? null);
  if (storagePath) {
    await adminClient.storage
      .from(COURT_LINE_QR_BUCKET)
      .remove([storagePath]);
  }

  const { error: updateError } = await adminClient
    .from("courts")
    .update({ line_qr_url: null, updated_at: new Date().toISOString() })
    .eq("id", resolved.courtId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
