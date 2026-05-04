import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/server/adminApi";
import { deleteGroupWithAssets } from "@/server/adminDeletion";

type RouteParams = { groupId: string };

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
