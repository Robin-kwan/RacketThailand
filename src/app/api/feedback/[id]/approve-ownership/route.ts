import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApiAccess } from "@/server/adminApi";

type Params = { id: string };

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  const { user, error: accessError } = await requireAdminApiAccess();
  if (accessError === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (accessError === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: assignment, error: assignmentError } = await adminSupabase.rpc(
    "approve_listing_ownership_claim",
    {
      p_claim_id: id,
      p_admin_id: user.id,
    },
  );

  if (assignmentError) {
    const statusByMessage: Record<string, number> = {
      ADMIN_REQUIRED: 403,
      OWNERSHIP_CLAIM_NOT_FOUND: 404,
      INVALID_OWNERSHIP_CLAIM: 400,
      CLAIM_ALREADY_CLOSED: 409,
      CLAIM_CHANGED_RETRY: 409,
      LISTING_NOT_FOUND: 404,
    };
    return NextResponse.json(
      { error: assignmentError.message },
      { status: statusByMessage[assignmentError.message] ?? 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    assignment: Array.isArray(assignment) ? assignment[0] : assignment,
  });
}
