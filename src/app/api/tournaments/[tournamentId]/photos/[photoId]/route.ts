import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isValidTournamentUuid } from "@/server/tournamentValidation";

const TOURNAMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_TOURNAMENT_BUCKET || "tournament-images";

type RouteParams = Promise<{ tournamentId: string; photoId: string }>;

function getStoragePath(imageUrl: string) {
  const marker = `/storage/v1/object/public/${TOURNAMENT_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
}

async function authorizeTournamentPhotoChange(tournamentId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const admin = getSupabaseAdminClient();
  const [tournamentResult, profileResult] = await Promise.all([
    admin
      .from("tournaments")
      .select("owner_id")
      .eq("id", tournamentId)
      .maybeSingle(),
    admin.from("profiles").select("status").eq("id", user.id).maybeSingle(),
  ]);
  if (tournamentResult.error || profileResult.error) {
    return { error: "Unable to verify tournament access.", status: 500 } as const;
  }
  const tournament = tournamentResult.data;
  const profile = profileResult.data;
  if (!tournament)
    return { error: "Tournament not found.", status: 404 } as const;
  if (tournament.owner_id !== user.id && profile?.status !== "admin")
    return { error: "Forbidden", status: 403 } as const;
  return { admin } as const;
}

export async function PATCH(
  _request: Request,
  { params }: { params: RouteParams },
) {
  const { tournamentId, photoId } = await params;
  if (
    !isValidTournamentUuid(tournamentId) ||
    !isValidTournamentUuid(photoId)
  ) {
    return NextResponse.json(
      { error: "Tournament or photo identifier is invalid." },
      { status: 400 },
    );
  }
  const authorization = await authorizeTournamentPhotoChange(tournamentId);
  if ("error" in authorization) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }
  const { admin } = authorization;
  const { error } = await admin.rpc("set_tournament_primary_photo", {
    p_tournament_id: tournamentId,
    p_photo_id: photoId,
  });
  if (error) {
    const status = error.message.includes("Photo not found") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  await admin
    .from("tournaments")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", tournamentId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: RouteParams },
) {
  const { tournamentId, photoId } = await params;
  if (
    !isValidTournamentUuid(tournamentId) ||
    !isValidTournamentUuid(photoId)
  ) {
    return NextResponse.json(
      { error: "Tournament or photo identifier is invalid." },
      { status: 400 },
    );
  }
  const authorization = await authorizeTournamentPhotoChange(tournamentId);
  if ("error" in authorization) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }
  const { admin } = authorization;

  const { data: deletedImageUrl, error: deleteError } = await admin.rpc(
    "delete_tournament_photo",
    {
      p_tournament_id: tournamentId,
      p_photo_id: photoId,
    },
  );
  if (deleteError) {
    const status = deleteError.message.includes("keep at least one")
      ? 400
      : deleteError.message.includes("Photo not found")
        ? 404
        : 500;
    return NextResponse.json({ error: deleteError.message }, { status });
  }

  const storagePath = getStoragePath(deletedImageUrl);
  if (storagePath) {
    await admin.storage.from(TOURNAMENT_BUCKET).remove([storagePath]);
  }

  await admin
    .from("tournaments")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  return NextResponse.json({ ok: true });
}
