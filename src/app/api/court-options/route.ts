import { NextResponse } from "next/server";
import { supabaseSelect } from "@/lib/supabaseRest";

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
    const { data } = await supabaseSelect<CourtRow>("courts", {
      select: "id,name,province",
      sport_id: `eq.${sportId}`,
      order: "name.asc.nullslast",
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
