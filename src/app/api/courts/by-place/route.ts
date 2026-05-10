import { NextResponse } from "next/server";
import { findCourtByGooglePlaceId } from "@/server/courtDuplicate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim();
  const excludeCourtId = searchParams.get("excludeCourtId")?.trim();

  if (!placeId) {
    return NextResponse.json(
      { error: "Missing placeId parameter." },
      { status: 400 },
    );
  }

  const court = await findCourtByGooglePlaceId(placeId, excludeCourtId);

  return NextResponse.json({ court });
}
