import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  id: string;
};

type UpdatePayload = {
  checked?: boolean;
  status?: string;
};

const VALID_STATUSES = ["open", "in_review", "resolved", "dismissed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof payload.checked === "boolean") {
    updateData.checked = payload.checked;
  }

  if (payload.status !== undefined) {
    if (!VALID_STATUSES.includes(payload.status)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 },
      );
    }
    updateData.status = payload.status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("feedback")
    .update(updateData)
    .eq("id", resolvedParams.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
