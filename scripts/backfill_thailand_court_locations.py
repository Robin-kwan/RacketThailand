from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(r"C:\Work\RacketThailand")
ENV_PATH = ROOT / ".env"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


@dataclass(frozen=True)
class Province:
    id: int
    name_th: str
    name_en: str


@dataclass(frozen=True)
class District:
    id: int
    province_id: int
    name_th: str
    name_en: str


def read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize_token(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("(", " ")
        .replace(")", " ")
        .replace(".", " ")
        .replace(",", " ")
        .replace("/", " ")
        .replace("\\", " ")
        .replace("-", " ")
        .replace(" ", "")
    )


def strip_leading_prefixes(value: str, prefixes: list[str]) -> str:
    next_value = value.strip()
    changed = True
    while changed:
        changed = False
        for prefix in prefixes:
            if next_value.startswith(prefix):
                next_value = next_value[len(prefix) :].strip()
                changed = True
    return next_value


def strip_english_affixes(value: str) -> str:
    lower = value.strip().lower()
    prefixes = ["province ", "district ", "amphoe ", "amphur ", "khet "]
    for prefix in prefixes:
        if lower.startswith(prefix):
            return value.strip()[len(prefix) :].strip()
    for suffix in [" province", " district"]:
        if lower.endswith(suffix):
            return value.strip()[: -len(suffix)].strip()
    return value.strip()


def build_aliases(name_th: str, name_en: str, is_district: bool) -> set[str]:
    prefixes = ["อำเภอ", "เขต"] if is_district else ["จังหวัด"]
    candidates = [
        name_th,
        strip_leading_prefixes(name_th, prefixes),
        name_en,
        strip_english_affixes(name_en),
    ]
    return {normalize_token(candidate) for candidate in candidates if candidate.strip()}


def build_lookup_keys(value: str, is_district: bool) -> list[str]:
    prefixes = ["อำเภอ", "เขต"] if is_district else ["จังหวัด"]
    candidates = [
        value,
        strip_leading_prefixes(value, prefixes),
        strip_english_affixes(value),
    ]
    seen: list[str] = []
    for candidate in candidates:
        key = normalize_token(candidate)
        if key and key not in seen:
            seen.append(key)
    return seen


def request_json(url: str, *, headers: dict[str, str] | None = None, method: str = "GET", body: bytes | None = None):
    request = urllib.request.Request(url, headers=headers or {}, method=method, data=body)
    with urllib.request.urlopen(request) as response:
        payload = response.read()
        if not payload:
            return None
        return json.loads(payload.decode("utf-8"))


def load_reference_tables(project_url: str, service_role: str):
    base_headers = {
        "apikey": service_role,
        "Authorization": f"Bearer {service_role}",
        "Accept": "application/json",
    }
    provinces_json = request_json(
        f"{project_url}/rest/v1/provinces?select=id,name_th,name_en&order=id.asc",
        headers=base_headers,
    )
    districts_json = request_json(
        f"{project_url}/rest/v1/districts?select=id,province_id,name_th,name_en&order=id.asc",
        headers=base_headers,
    )

    provinces = {
        int(row["id"]): Province(
            id=int(row["id"]),
            name_th=row["name_th"],
            name_en=row["name_en"],
        )
        for row in provinces_json
    }
    province_alias_map: dict[str, int] = {}
    for province in provinces.values():
        for alias in build_aliases(province.name_th, province.name_en, False):
            province_alias_map[alias] = province.id

    districts_by_province: dict[int, list[District]] = {}
    for row in districts_json:
        district = District(
            id=int(row["id"]),
            province_id=int(row["province_id"]),
            name_th=row["name_th"],
            name_en=row["name_en"],
        )
        districts_by_province.setdefault(district.province_id, []).append(district)

    district_aliases_by_province: dict[int, dict[str, District]] = {}
    for province_id, districts in districts_by_province.items():
        alias_map: dict[str, District] = {}
        for district in districts:
            for alias in build_aliases(district.name_th, district.name_en, True):
                alias_map[alias] = district
        district_aliases_by_province[province_id] = alias_map

    return provinces, province_alias_map, district_aliases_by_province


def extract_component(components: list[dict], types: list[str]) -> str | None:
    for target_type in types:
        for component in components:
            if target_type in component.get("types", []):
                return component.get("long_name") or component.get("short_name")
    return None


def geocode_coordinates(lat: float, lng: float, google_key: str) -> list[dict]:
    query = urllib.parse.urlencode(
        {
          "latlng": f"{lat},{lng}",
          "language": "th",
          "key": google_key,
        }
    )
    data = request_json(f"{GOOGLE_GEOCODE_URL}?{query}")
    results = data.get("results") or []
    if data.get("status") != "OK" or not results:
        return []
    return results


def main() -> int:
    env = read_env()
    project_url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL") or "https://gihlcdslgordcujfmnaa.supabase.co"
    service_role = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE")
    google_key = env.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
    if not service_role:
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE in .env")
    if not google_key:
        raise RuntimeError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env")

    provinces, province_alias_map, district_aliases_by_province = load_reference_tables(project_url, service_role)
    headers = {
        "apikey": service_role,
        "Authorization": f"Bearer {service_role}",
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "Prefer": "return=minimal",
    }

    courts = request_json(
        f"{project_url}/rest/v1/courts?select=id,name,address,district,province,lat,lng,google_place_id,province_id,district_id&or=(province_id.is.null,district_id.is.null)&order=name.asc",
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}",
            "Accept": "application/json",
        },
    )

    updated: list[dict] = []
    skipped: list[dict] = []

    for court in courts:
        lat = court.get("lat")
        lng = court.get("lng")
        if lat is None or lng is None or math.isnan(float(lat)) or math.isnan(float(lng)):
            skipped.append(
                {
                    "id": court["id"],
                    "name": court.get("name"),
                    "reason": "missing_coordinates",
                }
            )
            continue

        geocodes = geocode_coordinates(float(lat), float(lng), google_key)
        if not geocodes:
            skipped.append(
                {
                    "id": court["id"],
                    "name": court.get("name"),
                    "reason": "geocode_failed",
                }
            )
            continue

        matched = None
        fallback_names = {"province": None, "district": None}
        for geocode in geocodes:
            components = geocode.get("address_components", [])
            province_name = extract_component(components, ["administrative_area_level_1"])
            district_name = extract_component(
                components,
                ["administrative_area_level_2", "sublocality_level_1", "sublocality", "locality"],
            )
            if fallback_names["province"] is None and province_name:
                fallback_names["province"] = province_name
            if fallback_names["district"] is None and district_name:
                fallback_names["district"] = district_name
            province_id = None
            for key in build_lookup_keys(province_name or "", False):
                province_id = province_alias_map.get(key)
                if province_id is not None:
                    break
            district = None
            if province_id and district_name:
                province_districts = district_aliases_by_province.get(province_id, {})
                for key in build_lookup_keys(district_name, True):
                    district = province_districts.get(key)
                    if district is not None:
                        break
            if province_id and district:
                matched = (geocode, province_id, district)
                break

        if not matched:
            skipped.append(
                {
                    "id": court["id"],
                    "name": court.get("name"),
                    "reason": "unmatched_location",
                    "province": fallback_names["province"],
                    "district": fallback_names["district"],
                }
            )
            continue

        geocode, province_id, district = matched

        province = provinces[province_id]
        update_payload = {
            "province_id": province.id,
            "district_id": district.id,
            "province": province.name_th,
            "district": district.name_th,
            "google_place_id": court.get("google_place_id") or geocode.get("place_id"),
        }
        request_json(
            f"{project_url}/rest/v1/courts?id=eq.{court['id']}",
            headers=headers,
            method="PATCH",
            body=json.dumps(update_payload, ensure_ascii=False).encode("utf-8"),
        )
        updated.append(
            {
                "id": court["id"],
                "name": court.get("name"),
                "province_before": court.get("province"),
                "province_after": province.name_th,
                "district_before": court.get("district"),
                "district_after": district.name_th,
                "province_id": province.id,
                "district_id": district.id,
                "google_place_id_added": court.get("google_place_id") is None and geocode.get("place_id") is not None,
            }
        )

    print(
        json.dumps(
            {
                "total_candidates": len(courts),
                "updated_count": len(updated),
                "skipped_count": len(skipped),
                "updated": updated,
                "skipped": skipped,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
