import type { PlaceDetailsPayload } from "@/lib/google-places";
import { resolveThailandLocationIds } from "@/server/thailand-location";

export async function enrichPlaceWithThailandLocation(
  place: PlaceDetailsPayload,
): Promise<PlaceDetailsPayload>;
export async function enrichPlaceWithThailandLocation(
  place: PlaceDetailsPayload | null | undefined,
): Promise<PlaceDetailsPayload | null | undefined> {
  if (!place) {
    return place;
  }

  const resolved = await resolveThailandLocationIds({
    province: place.province,
    district: place.district,
  });

  return {
    ...place,
    province: resolved.provinceNameTh ?? place.province,
    district: resolved.districtNameTh ?? place.district,
    provinceId: resolved.provinceId ?? undefined,
    districtId: resolved.districtId ?? undefined,
  };
}
