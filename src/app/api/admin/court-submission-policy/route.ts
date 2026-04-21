import { NextResponse } from "next/server";
import {
  getAllowPublicCourtPublish,
  setAllowPublicCourtPublish,
} from "@/lib/court-submission-policy";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type UpdatePayload = {
  allowPublicCourtPublish?: boolean;
};

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, error: "UNAUTHORIZED" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "admin") {
    return { user: null, error: "FORBIDDEN" as const };
  }

  return { user, error: null };
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN" || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (typeof payload.allowPublicCourtPublish !== "boolean") {
    return NextResponse.json(
      { error: "allowPublicCourtPublish must be a boolean." },
      { status: 400 },
    );
  }

  const result = await setAllowPublicCourtPublish(
    payload.allowPublicCourtPublish,
    user.id,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    allowPublicCourtPublish: payload.allowPublicCourtPublish,
  });
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowPublicCourtPublish = await getAllowPublicCourtPublish();
  return NextResponse.json({ ok: true, allowPublicCourtPublish });
}
