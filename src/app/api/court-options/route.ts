import { NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchCourtIdsBySportId } from "@/server/courtSports";
import { localizeThailandLocation } from "@/server/thailand-location";

type CourtRow = {
  id: string;
  name: string | null;
  province: string | null;
  province_id?: number | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sportId = searchParams.get("sportId");
  const locale = normalizeLocale(searchParams.get("lang"));

  if (!sportId) {
    return NextResponse.json(
      { error: "Missing sportId parameter." },
      { status: 400 },
    );
  }

  try {
    const courtIds = await fetchCourtIdsBySportId(sportId);
    const params: Record<string, string> = {
      select: "id,name,province,province_id",
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

    const options = await Promise.all(
      (data ?? []).map(async (court) => {
        const localized = await localizeThailandLocation(court, locale);
        const labelParts = [court.name ?? "Unnamed court"];
        if (localized.province) {
          labelParts.push(localized.province);
        }
        return {
          value: court.id,
          label: labelParts.join(" · "),
        };
      }),
    );

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
