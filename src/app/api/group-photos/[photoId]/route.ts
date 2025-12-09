import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";

type GroupPhotoRow = {
  id: string;
  group_id: string;
  image_url: string | null;
};

async function requirePhotoPermission(photoId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null, error: "UNAUTHORIZED" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: photo } = await supabase
    .from("group_photos")
    .select("id,group_id,image_url")
    .eq("id", photoId)
    .single();
  const typedPhoto = photo as GroupPhotoRow | null;

  if (!typedPhoto) {
    return { supabase, user, error: "NOT_FOUND" as const, photo: null };
  }

  if (!isAdmin) {
    const { data: group } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", typedPhoto.group_id)
      .single();
    if (group?.owner_id !== user.id) {
      return {
        supabase,
        user,
        error: "FORBIDDEN" as const,
        photo: typedPhoto,
      };
    }
  }

  return { supabase, user, error: null, photo: typedPhoto };
}

function extractStoragePath(url: string | null) {
  if (!url) return null;
  const marker = `/object/public/${GROUP_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const resolvedParams = await params;
  const { supabase, error, photo } = await requirePhotoPermission(
    resolvedParams.photoId,
  );
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error === "NOT_FOUND") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("group_photos")
    .delete()
    .eq("id", resolvedParams.photoId);
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  const path = extractStoragePath(photo?.image_url ?? null);
  if (path) {
    await supabase.storage.from(GROUP_BUCKET).remove([path]);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const resolvedParams = await params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };
  if (body.action !== "setPrimary") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { supabase, error, photo } = await requirePhotoPermission(
    resolvedParams.photoId,
  );
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error === "NOT_FOUND" || !photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: resetError } = await supabase
    .from("group_photos")
    .update({ is_primary: false })
    .eq("group_id", photo.group_id);
  if (resetError) {
    return NextResponse.json(
      { error: resetError.message },
      { status: 500 },
    );
  }

  await supabase
    .from("group_photos")
    .update({ is_primary: true })
    .eq("id", resolvedParams.photoId);

  return NextResponse.json({ ok: true });
}
