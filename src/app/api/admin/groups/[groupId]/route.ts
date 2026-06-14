import { NextResponse } from "next/server";
import { normalizeGroupStatus } from "@/lib/group-status";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApiAccess } from "@/server/adminApi";
import { deleteGroupWithAssets } from "@/server/adminDeletion";

type RouteParams = { groupId: string };
type PatchPayload = {
  status?: string | null;
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
  if (payload.status === undefined) {
    return NextResponse.json(
      { error: "Status is required." },
      { status: 400 },
    );
  }

  const resolvedParams = await params;
  const adminSupabase = getSupabaseAdminClient();
  const status = normalizeGroupStatus(payload.status);

  const { error: updateError } = await adminSupabase
    .from("groups")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedParams.groupId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status });
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
  const result = await deleteGroupWithAssets(resolvedParams.groupId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
