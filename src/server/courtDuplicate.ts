import { supabaseSelect } from "@/lib/supabaseRest";

type CourtDuplicateRow = {
  id: string;
  name: string | null;
};

export async function findCourtByGooglePlaceId(
  placeId?: string | null,
  excludeCourtId?: string | null,
) {
  const normalizedPlaceId = placeId?.trim();
  if (!normalizedPlaceId) {
    return null;
  }

  const { data } = await supabaseSelect<CourtDuplicateRow>(
    "courts",
    {
      select: "id,name",
      google_place_id: `eq.${normalizedPlaceId}`,
      order: "is_active.desc.nullslast,updated_at.desc.nullslast",
      limit: "5",
    },
    { preferCount: false },
  );

  return data?.find((court) => court.id !== excludeCourtId) ?? null;
}

export function buildDuplicateCourtMessage(court: CourtDuplicateRow) {
  return `This place is already registered as ${court.name ?? "existing court"}.`;
}
