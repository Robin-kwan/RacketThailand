#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const EARTH_RADIUS_M = 6371000;
const BAD_TEXT_RE = /\uFFFD|\?{2,}|à¸|à¹|Ã.|Â./u;

main().catch((error) => {
  console.error(`[audit] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

async function main() {
  loadDotEnvLocal();
  const supabaseUrl = mustEnv("SUPABASE_URL");
  const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const [courts, groups, courtPhotos, groupPhotos] = await Promise.all([
    requestJson(supabaseUrl, serviceRoleKey, "courts?select=id,name,address,district,province,description,lat,lng,google_place_id"),
    requestJson(supabaseUrl, serviceRoleKey, "groups?select=id,name,description,phone,line_id"),
    requestJson(supabaseUrl, serviceRoleKey, "court_photos?select=id,court_id,image_url,is_primary"),
    requestJson(supabaseUrl, serviceRoleKey, "group_photos?select=id,group_id,image_url,is_primary"),
  ]);

  const courtPhotoMap = groupBy(courtPhotos, "court_id");
  const groupPhotoMap = groupBy(groupPhotos, "group_id");

  const findings = {
    badCourtText: [],
    badGroupText: [],
    missingCourtPhoto: [],
    missingGroupPhoto: [],
    badCourtPhotoUrl: [],
    badGroupPhotoUrl: [],
    missingPlaceId: [],
    invalidPlaceId: [],
    placeMismatch: [],
  };

  for (const court of courts) {
    const badField = firstBadTextField(court, ["name", "address", "district", "province", "description"]);
    if (badField) findings.badCourtText.push({ id: court.id, name: court.name, field: badField });

    const photos = courtPhotoMap.get(court.id) ?? [];
    if (!photos.length) findings.missingCourtPhoto.push({ id: court.id, name: court.name });
    for (const photo of photos) {
      const ok = await urlIsReachable(photo.image_url);
      if (!ok) findings.badCourtPhotoUrl.push({ id: court.id, name: court.name, photoId: photo.id, imageUrl: photo.image_url });
    }

    if (!court.google_place_id) {
      findings.missingPlaceId.push({ id: court.id, name: court.name });
      continue;
    }
    if (!googleApiKey) continue;

    const place = await getPlaceDetails(court.google_place_id, googleApiKey);
    if (!place.ok) {
      findings.invalidPlaceId.push({ id: court.id, name: court.name, placeId: court.google_place_id, status: place.status });
      continue;
    }
    if (typeof court.lat === "number" && typeof court.lng === "number") {
      const d = haversineMeters(court.lat, court.lng, place.lat, place.lng);
      if (d > 500) {
        findings.placeMismatch.push({
          id: court.id,
          name: court.name,
          placeId: court.google_place_id,
          distanceM: Math.round(d),
        });
      }
    }
  }

  for (const group of groups) {
    const badField = firstBadTextField(group, ["name", "description", "phone", "line_id"]);
    if (badField) findings.badGroupText.push({ id: group.id, name: group.name, field: badField });

    const photos = groupPhotoMap.get(group.id) ?? [];
    if (!photos.length) findings.missingGroupPhoto.push({ id: group.id, name: group.name });
    for (const photo of photos) {
      const ok = await urlIsReachable(photo.image_url);
      if (!ok) findings.badGroupPhotoUrl.push({ id: group.id, name: group.name, photoId: photo.id, imageUrl: photo.image_url });
    }
  }

  const reportPath = path.join(ROOT, "docs", "ops", `db-integrity-audit-${today}.md`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, toMarkdownReport(today, courts.length, groups.length, findings), "utf8");

  console.log(`[audit] report written: ${reportPath}`);
  console.log(
    `[audit] summary badCourtText=${findings.badCourtText.length} badGroupText=${findings.badGroupText.length} ` +
    `missingCourtPhoto=${findings.missingCourtPhoto.length} missingGroupPhoto=${findings.missingGroupPhoto.length} ` +
    `badCourtPhotoUrl=${findings.badCourtPhotoUrl.length} badGroupPhotoUrl=${findings.badGroupPhotoUrl.length} ` +
    `missingPlaceId=${findings.missingPlaceId.length} invalidPlaceId=${findings.invalidPlaceId.length} ` +
    `placeMismatch=${findings.placeMismatch.length}`,
  );
}

function firstBadTextField(row, fields) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && BAD_TEXT_RE.test(value)) return field;
  }
  return null;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }
  return map;
}

async function urlIsReachable(url) {
  if (!url) return false;
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (head.ok) return true;
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return get.ok;
  } catch {
    return false;
  }
}

async function getPlaceDetails(placeId, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,geometry/location");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return { ok: false, status: `HTTP_${response.status}` };
  const body = await response.json();
  if (body.status !== "OK" || !body.result?.geometry?.location) {
    return { ok: false, status: body.status || "UNKNOWN" };
  }
  return { ok: true, lat: body.result.geometry.location.lat, lng: body.result.geometry.location.lng };
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function toMarkdownReport(date, courtCount, groupCount, f) {
  return `# DB Integrity Audit - ${date}

## Scope
- Courts scanned: ${courtCount}
- Groups scanned: ${groupCount}

## Summary
- Corrupted court text fields: ${f.badCourtText.length}
- Corrupted group text fields: ${f.badGroupText.length}
- Courts missing photos: ${f.missingCourtPhoto.length}
- Groups missing photos: ${f.missingGroupPhoto.length}
- Unreachable court photo URLs: ${f.badCourtPhotoUrl.length}
- Unreachable group photo URLs: ${f.badGroupPhotoUrl.length}
- Courts missing place IDs: ${f.missingPlaceId.length}
- Invalid place IDs: ${f.invalidPlaceId.length}
- Place geometry mismatches (>500m): ${f.placeMismatch.length}

## Corrupted Court Text
${toList(f.badCourtText, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | field=${x.field}`)}

## Corrupted Group Text
${toList(f.badGroupText, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | field=${x.field}`)}

## Courts Missing Photos
${toList(f.missingCourtPhoto, (x) => `- ${x.id} | ${x.name ?? "unnamed"}`)}

## Groups Missing Photos
${toList(f.missingGroupPhoto, (x) => `- ${x.id} | ${x.name ?? "unnamed"}`)}

## Unreachable Court Photo URLs
${toList(f.badCourtPhotoUrl, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | ${x.imageUrl}`)}

## Unreachable Group Photo URLs
${toList(f.badGroupPhotoUrl, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | ${x.imageUrl}`)}

## Courts Missing Place ID
${toList(f.missingPlaceId, (x) => `- ${x.id} | ${x.name ?? "unnamed"}`)}

## Invalid Place IDs
${toList(f.invalidPlaceId, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | ${x.placeId} | status=${x.status}`)}

## Place Mismatches
${toList(f.placeMismatch, (x) => `- ${x.id} | ${x.name ?? "unnamed"} | ${x.placeId} | ${x.distanceM}m`)}
`;
}

function toList(items, formatItem) {
  if (!items.length) return "- none";
  return items.map(formatItem).join("\n");
}

function loadDotEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return;
  const text = fs.readFileSync(ENV_PATH, "utf8");
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = line.slice(idx + 1).trim();
  }
}

function mustEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function requestJson(url, key, pathWithQuery) {
  const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`request failed: ${response.status} ${text}`);
  }
  return response.json();
}
