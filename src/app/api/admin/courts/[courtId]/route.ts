import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApiAccess } from "@/server/adminApi";
import { deleteCourtWithAssets } from "@/server/adminDeletion";

type RouteParams = { courtId: string };
type PatchPayload = {
  is_active?: boolean | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { error } = await requireAdminApiAccess();

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as PatchPayload;
  if (typeof payload.is_active !== "boolean") {
    return NextResponse.json(
      { error: "is_active must be a boolean." },
      { status: 400 },
    );
  }

  const resolvedParams = await params;
  const adminSupabase = getSupabaseAdminClient();
  const { error: updateError } = await adminSupabase
    .from("courts")
    .update({
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedParams.courtId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, is_active: payload.is_active });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { error } = await requireAdminApiAccess();

  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const result = await deleteCourtWithAssets(resolvedParams.courtId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
