import "server-only";

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireGroupAccess } from "@/server/groupAccess";
import { ensureGroupLineQrUrl } from "@/server/lineQr";

const GROUP_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_LINE_QR_BUCKET || "group-line-qr";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured to manage LINE QR uploads.",
  );
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

type RouteParams = { groupId: string };
type RouteParamsInput = Promise<RouteParams>;

async function resolveParams(params: RouteParamsInput) {
  return params;
}

function extractPathFromUrl(url: string | null) {
  if (!url) return null;
  try {
    const prefix = `/storage/v1/object/public/${GROUP_LINE_QR_BUCKET}/`;
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
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { supabase, error } = await requireGroupAccess(resolved.groupId);

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

  const ext = file.name.split(".").pop() || "png";
  const filePath = `${resolved.groupId}/line-qr.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminClient.storage
    .from(GROUP_LINE_QR_BUCKET)
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
  } = adminClient.storage.from(GROUP_LINE_QR_BUCKET).getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("groups")
    .update({ line_qr_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", resolved.groupId);

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
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { supabase, error } = await requireGroupAccess(resolved.groupId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: group, error: fetchError } = await supabase
    .from("groups")
    .select("line_qr_url")
    .eq("id", resolved.groupId)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 },
    );
  }

  const currentUrl = group?.line_qr_url ?? null;
  const storagePath = extractPathFromUrl(currentUrl);

  if (storagePath) {
    await adminClient.storage.from(GROUP_LINE_QR_BUCKET).remove([storagePath]);
  }

  const { error: updateError } = await supabase
    .from("groups")
    .update({ line_qr_url: null, updated_at: new Date().toISOString() })
    .eq("id", resolved.groupId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: Request,
  options: { params: RouteParamsInput },
) {
  const resolved = await resolveParams(options.params);
  const { supabase, error } = await requireGroupAccess(resolved.groupId);

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: fetchError } = await supabase
    .from("groups")
    .select("line_qr_url")
    .eq("id", resolved.groupId)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 },
    );
  }

  const nextUrl = await ensureGroupLineQrUrl(
    resolved.groupId,
    data?.line_qr_url ?? null,
  );
  return NextResponse.json({ lineQrUrl: nextUrl });
}
