import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateOptimizedPhotoFile } from "@/lib/image-upload";
import { isValidTournamentUuid } from "@/server/tournamentValidation";

const TOURNAMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_TOURNAMENT_BUCKET || "tournament-images";
const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type RouteParams = { tournamentId: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { tournamentId } = await params;
  if (!isValidTournamentUuid(tournamentId)) {
    return NextResponse.json(
      { error: "Tournament identifier is invalid." },
      { status: 400 },
    );
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json(
      { error: "Unable to verify tournament access." },
      { status: 500 },
    );
  }
  const tournament = tournamentResult.data;
  const profile = profileResult.data;
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 },
    );
  }
  if (tournament.owner_id !== user.id && profile?.status !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data." },
      { status: 400 },
    );
  }
  const file = formData.get("file");
  const isPrimary = formData.get("isPrimary") === "true";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Tournament photo is required." },
      { status: 400 },
    );
  }
  const validationError = validateOptimizedPhotoFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const extension = IMAGE_EXTENSION_BY_TYPE[file.type];
  const filePath = `${tournamentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(TOURNAMENT_BUCKET)
    .upload(filePath, Buffer.from(await file.arrayBuffer()), {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(TOURNAMENT_BUCKET).getPublicUrl(filePath);
  const { data: photo, error: insertError } = await admin.rpc(
    "add_tournament_photo",
    {
      p_tournament_id: tournamentId,
      p_image_url: publicUrl,
      p_is_primary: isPrimary,
    },
  );
  if (insertError) {
    await admin.storage.from(TOURNAMENT_BUCKET).remove([filePath]);
    const status = insertError.message.includes("at most 8 images") ? 400 : 500;
    return NextResponse.json({ error: insertError.message }, { status });
  }

  return NextResponse.json({ ok: true, photo });
}
