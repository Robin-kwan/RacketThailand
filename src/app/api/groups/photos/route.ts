import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PhotoPayload = {
  groupId: string;
  imageUrl: string;
  isPrimary?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PhotoPayload;
  if (!payload.groupId || !payload.imageUrl) {
    return NextResponse.json(
      { error: "Missing groupId or imageUrl" },
      { status: 400 },
    );
  }

  const { data: insertedPhoto, error: insertError } = await supabase
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
    await supabase
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
