import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  id: string;
};

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", resolvedParams.id)
    .eq("recipient_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { error } = await adminSupabase
    .from("notifications")
    .delete()
    .eq("id", resolvedParams.id)
    .eq("recipient_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
