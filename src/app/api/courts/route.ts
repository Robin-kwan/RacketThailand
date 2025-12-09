import { NextResponse } from "next/server";
import {
  fetchCourtsBySport,
  type CourtFilterOptions,
} from "@/server/courtFinder";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");

  if (!sport) {
    return NextResponse.json(
      { error: "Missing sport parameter." },
      { status: 400 },
    );
  }

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const filters: CourtFilterOptions = {
    search: searchParams.get("q") ?? undefined,
    province: searchParams.get("province") ?? undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
    offset:
      Number.isFinite(page) && page > 1 ? (page - 1) * (limit || 12) : 0,
  };

  try {
    const result = await fetchCourtsBySport(sport, filters);
    if (!result.sport) {
      return NextResponse.json({ courts: [], count: 0, provinces: [] });
    }
    return NextResponse.json({
      courts: result.courts,
      count: result.count,
      provinces: result.provinces,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
