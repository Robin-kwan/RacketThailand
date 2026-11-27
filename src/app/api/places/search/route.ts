import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  PlaceSearchError,
  searchGooglePlaces,
} from "@/server/google-place-search";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = params.get("input")?.trim() ?? "";
  const isLink = params.get("mode") === "link";
  if (input.length < 3 || input.length > (isLink ? 4096 : 300)) {
    return NextResponse.json(
      { error: "invalidInput", predictions: [] },
      { status: 400 },
    );
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "signInRequired", predictions: [] },
      { status: 401 },
    );
  try {
    const predictions = await searchGooglePlaces(input, isLink);
    return NextResponse.json({ predictions });
  } catch (error) {
    const code =
      error instanceof PlaceSearchError ? error.code : "lookupFailed";
    return NextResponse.json(
      { error: code, predictions: [] },
      { status: code === "lookupFailed" ? 502 : 422 },
    );
  }
}
