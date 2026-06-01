import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireGroupAccess } from "@/server/groupAccess";

type PhotoPayload = {
  groupId: string;
  imageUrl: string;
  isPrimary?: boolean;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as PhotoPayload;
  if (!payload.groupId || !payload.imageUrl) {
    return NextResponse.json(
      { error: "Missing groupId or imageUrl" },
      { status: 400 },
    );
  }

  const { error: accessError } = await requireGroupAccess(payload.groupId);
  if (accessError === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (accessError === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: insertedPhoto, error: insertError } = await adminSupabase
    .from("group_photos")
    .insert({
      group_id: payload.groupId,
      image_url: payload.imageUrl,
      is_primary: payload.isPrimary ?? false,
    })
    .select("id,image_url,is_primary")
    .single();

  if (insertError) {
    const message =
      insertError.message ??
      "Failed to store group photo. Please try again.";
    const status = message.includes("row-level security") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  if (payload.isPrimary && insertedPhoto) {
    await adminSupabase
      .from("group_photos")
      .update({ is_primary: false })
      .eq("group_id", payload.groupId)
      .neq("id", insertedPhoto.id);
  }

  return NextResponse.json({
    ok: true,
    photo: insertedPhoto ?? null,
  });
}
