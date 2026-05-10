import { NextResponse } from "next/server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchCourtIdsBySportId } from "@/server/courtSports";

type CourtRow = {
  id: string;
  name: string | null;
  province: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sportId = searchParams.get("sportId");

  if (!sportId) {
    return NextResponse.json(
      { error: "Missing sportId parameter." },
      { status: 400 },
    );
  }

  try {
    const courtIds = await fetchCourtIdsBySportId(sportId);
    const params: Record<string, string> = {
      select: "id,name,province",
      order: "name.asc.nullslast",
    };
    if (courtIds.length > 0) {
      params.id = `in.(${courtIds.join(",")})`;
    } else {
      params.id = "eq.00000000-0000-0000-0000-000000000000";
    }
    const { data } = await supabaseSelect<CourtRow>("courts", {
      ...params,
    });

    const options =
      data?.map((court) => {
        const labelParts = [court.name ?? "Unnamed court"];
        if (court.province) {
          labelParts.push(court.province);
        }
        return {
          value: court.id,
          label: labelParts.join(" · "),
        };
      }) ?? [];

    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load courts.",
      },
      { status: 500 },
    );
  }
}
