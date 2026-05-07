import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const COURT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images";
const COURT_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_LINE_QR_BUCKET || "court-line-qr";
const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";
const GROUP_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_LINE_QR_BUCKET || "group-line-qr";

type DeleteResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

type StorageDeleteResult = {
  error?: { message?: string } | null;
};

function extractPublicStoragePath(url: string | null | undefined, bucket: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(prefix);
    if (index !== -1) {
      return decodeURIComponent(parsed.pathname.slice(index + prefix.length));
    }
  } catch {
    // Fall through for stored relative or malformed URLs.
  }

  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

async function removeStorageUrls(
  supabase: SupabaseClient,
  bucket: string,
  urls: (string | null | undefined)[],
) {
  const paths = Array.from(
    new Set(
      urls
        .map((url) => extractPublicStoragePath(url, bucket))
        .filter((path): path is string => Boolean(path)),
    ),
  );

  if (paths.length === 0) {
    return null;
  }

  const result = (await supabase.storage
    .from(bucket)
    .remove(paths)) as StorageDeleteResult;
  return result.error?.message ?? null;
}

async function removeCourtAssets(
  supabase: SupabaseClient,
  photoUrls: (string | null)[],
  lineQrUrl: string | null,
) {
  const courtImageError = await removeStorageUrls(supabase, COURT_BUCKET, [
    ...photoUrls,
    lineQrUrl,
  ]);
  if (courtImageError) return courtImageError;

  return removeStorageUrls(supabase, COURT_LINE_QR_BUCKET, [lineQrUrl]);
}

async function removeGroupAssets(
  supabase: SupabaseClient,
  photoUrls: (string | null)[],
  lineQrUrl: string | null,
) {
  const groupImageError = await removeStorageUrls(supabase, GROUP_BUCKET, photoUrls);
  if (groupImageError) return groupImageError;

  return removeStorageUrls(supabase, GROUP_LINE_QR_BUCKET, [lineQrUrl]);
}

export async function deleteCourtWithAssets(courtId: string): Promise<DeleteResult> {
  const supabase = getSupabaseAdminClient();

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id,name,line_qr_url")
    .eq("id", courtId)
    .single();

  if (courtError || !court) {
    return { ok: false, status: 404, error: "Court not found." };
  }

  const { data: photos, error: photosError } = await supabase
    .from("court_photos")
    .select("image_url")
    .eq("court_id", courtId);

  if (photosError) {
    return { ok: false, status: 500, error: photosError.message };
  }

  const storageError = await removeCourtAssets(
    supabase,
    (photos ?? []).map((photo) => photo.image_url ?? null),
    court.line_qr_url ?? null,
  );

  if (storageError) {
    return { ok: false, status: 500, error: storageError };
  }

  const fallbackVenueName = court.name?.trim() || "Deleted court";
  const { error: casualVenueError } = await supabase
    .from("casual_plays")
    .update({ venue_name: fallbackVenueName })
    .eq("court_id", courtId)
    .is("venue_name", null);

  if (casualVenueError) {
    return { ok: false, status: 500, error: casualVenueError.message };
  }

  const cleanupOperations = [
    supabase.from("court_photos").delete().eq("court_id", courtId),
    supabase.from("court_groups").delete().eq("court_id", courtId),
    supabase.from("group_sessions").delete().eq("court_id", courtId),
    supabase.from("casual_plays").update({ court_id: null }).eq("court_id", courtId),
  ];

  for (const operation of cleanupOperations) {
    const { error } = await operation;
    if (error) {
      return { ok: false, status: 500, error: error.message };
    }
  }

  const { error: deleteError } = await supabase
    .from("courts")
    .delete()
    .eq("id", courtId);

  if (deleteError) {
    return { ok: false, status: 500, error: deleteError.message };
  }

  return { ok: true };
}

export async function deleteGroupWithAssets(groupId: string): Promise<DeleteResult> {
  const supabase = getSupabaseAdminClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,line_qr_url")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return { ok: false, status: 404, error: "Group not found." };
  }

  const { data: photos, error: photosError } = await supabase
    .from("group_photos")
    .select("image_url")
    .eq("group_id", groupId);

  if (photosError) {
    return { ok: false, status: 500, error: photosError.message };
  }

  const storageError = await removeGroupAssets(
    supabase,
    (photos ?? []).map((photo) => photo.image_url ?? null),
    group.line_qr_url ?? null,
  );

  if (storageError) {
    return { ok: false, status: 500, error: storageError };
  }

  const cleanupOperations = [
    supabase.from("group_photos").delete().eq("group_id", groupId),
    supabase.from("court_groups").delete().eq("group_id", groupId),
    supabase.from("group_sessions").delete().eq("group_id", groupId),
  ];

  for (const operation of cleanupOperations) {
    const { error } = await operation;
    if (error) {
      return { ok: false, status: 500, error: error.message };
    }
  }

  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteError) {
    return { ok: false, status: 500, error: deleteError.message };
  }

  return { ok: true };
}

export async function deleteCasualPlay(playId: string): Promise<DeleteResult> {
  const supabase = getSupabaseAdminClient();
  const { data: play, error: playError } = await supabase
    .from("casual_plays")
    .select("id")
    .eq("id", playId)
    .single();

  if (playError || !play) {
    return { ok: false, status: 404, error: "Casual play not found." };
  }

  const { error: joinRequestsError } = await supabase
    .from("casual_play_join_requests")
    .delete()
    .eq("play_id", playId);

  if (joinRequestsError) {
    return { ok: false, status: 500, error: joinRequestsError.message };
  }

  const { error: deleteError } = await supabase
    .from("casual_plays")
    .delete()
    .eq("id", playId);

  if (deleteError) {
    return { ok: false, status: 500, error: deleteError.message };
  }

  return { ok: true };
}
