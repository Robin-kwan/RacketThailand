import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  id: string;
};

type UpdatePayload = {
  checked?: boolean;
};

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

  if (typeof payload.checked !== "boolean") {
    return NextResponse.json(
      { error: "Checked state must be provided." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("feedback")
    .update({ checked: payload.checked })
    .eq("id", resolvedParams.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
