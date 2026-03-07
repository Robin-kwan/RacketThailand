#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const UTF8_JSON = "application/json; charset=utf-8";
const EARTH_RADIUS_M = 6371000;

const COURT_TEXT_FIELDS = ["name", "description", "address", "district", "province", "line_id"];
const GROUP_TEXT_FIELDS = ["name", "description", "phone", "line_id"];
const SUSPICIOUS_TEXT_RE = /\uFFFD|\?{2,}|à¸|à¹|Ã.|Â./u;

main().catch((error) => {
  console.error(`[intake] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

async function main() {
  loadDotEnvLocal();
  const supabaseUrl = mustEnv("SUPABASE_URL");
  const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

  const args = parseArgs(process.argv.slice(2));
  if (args.auditOnly) {
    await runEncodingAudit(supabaseUrl, serviceRoleKey);
    console.log("[intake] encoding audit passed");
    return;
  }

  if (!args.entity || !args.input) {
    throw new Error(
      "Usage: npm run intake:safe-insert -- --entity courts|groups --input <json-file> [--max N]",
    );
  }

  if (!["courts", "groups"].includes(args.entity)) {
    throw new Error("--entity must be courts or groups");
  }

  const maxInserts = Number.isFinite(args.max) && args.max > 0 ? args.max : 8;
  const items = readInputJson(args.input);
  if (!Array.isArray(items)) {
    throw new Error("Input JSON must be an array");
  }

  const sportsByCode = await fetchSportsMap(supabaseUrl, serviceRoleKey);
  const insertedIds = [];

  for (const raw of items.slice(0, maxInserts)) {
    const payload = args.entity === "courts"
      ? toCourtPayload(raw, sportsByCode)
      : toGroupPayload(raw, sportsByCode);

    if (args.entity === "courts") {
      await validateCourtPlace(payload);
    }

    const inserted = await postRow(supabaseUrl, serviceRoleKey, args.entity, payload);
    const repaired = await enforceEncodingIntegrity(
      supabaseUrl,
      serviceRoleKey,
      args.entity,
      inserted,
      payload,
    );

    await attachPrimaryPhotoIfProvided(
      supabaseUrl,
      serviceRoleKey,
      args.entity,
      repaired.id,
      raw,
    );

    insertedIds.push(repaired.id);
    console.log(`[intake] inserted ${args.entity.slice(0, -1)} ${repaired.id} (${repaired.name ?? "unnamed"})`);
  }

  console.log(
    `[intake] done: inserted ${insertedIds.length}/${Math.min(items.length, maxInserts)} ${args.entity}`,
  );
}

function parseArgs(argv) {
  const result = {
    entity: "",
    input: "",
    max: 8,
    auditOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--entity") result.entity = argv[i + 1] ?? "";
    if (token === "--input") result.input = argv[i + 1] ?? "";
    if (token === "--max") result.max = Number(argv[i + 1] ?? "8");
    if (token === "--audit-only") result.auditOnly = true;
  }

  return result;
}

function readInputJson(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
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
    const value = line.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

function mustEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function fetchSportsMap(url, key) {
  const rows = await requestJson(url, key, "sports?select=id,code");
  const map = new Map();
  for (const row of rows) map.set(row.code, row.id);
  return map;
}

function toCourtPayload(candidate, sportsByCode) {
  const sportId = sportsByCode.get(candidate.sport_code);
  if (!sportId) throw new Error(`Unknown sport_code for court: ${candidate.sport_code}`);

  return {
    sport_id: sportId,
    name: normalizeText(candidate.name),
    address: normalizeText(candidate.address),
    district: normalizeText(candidate.district),
    province: normalizeText(candidate.province),
    phone: normalizeText(candidate.phone),
    line_id: normalizeText(candidate.line_id),
    website_url: normalizeText(candidate.website_url),
    lat: candidate.latitude,
    lng: candidate.longitude,
    google_place_id: normalizeText(candidate.google_place_id ?? candidate.googlePlaceId),
    created_by: candidate.created_by,
    updated_at: new Date().toISOString(),
  };
}

function toGroupPayload(candidate, sportsByCode) {
  const sportId = sportsByCode.get(candidate.sport_code);
  if (!sportId) throw new Error(`Unknown sport_code for group: ${candidate.sport_code}`);

  return {
    sport_id: sportId,
    name: normalizeText(candidate.name),
    description: normalizeText(candidate.description),
    owner_id: candidate.owner_id,
    player_amount: candidate.player_amount ?? null,
    phone: normalizeText(candidate.phone),
    line_id: normalizeText(candidate.line_id),
    updated_at: new Date().toISOString(),
  };
}

function normalizeText(value) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.normalize("NFC");
}

async function postRow(url, key, table, payload) {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
      "Content-Type": UTF8_JSON,
    },
    body: JSON.stringify([payload]),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`insert failed (${table}): ${response.status} ${text}`);
  }

  const rows = await response.json();
  return rows[0];
}

async function validateCourtPlace(payload) {
  if (!payload.google_place_id) return;
  if (typeof payload.lat !== "number" || typeof payload.lng !== "number") return;

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!googleApiKey) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for court place validation");
  }

  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", payload.google_place_id);
  detailsUrl.searchParams.set("fields", "place_id,geometry/location");
  detailsUrl.searchParams.set("key", googleApiKey);

  const response = await fetch(detailsUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`google place details failed: ${response.status}`);
  }

  const body = await response.json();
  if (body.status !== "OK" || !body.result?.geometry?.location) {
    throw new Error(`invalid google_place_id: ${payload.google_place_id} (${body.status})`);
  }

  const loc = body.result.geometry.location;
  const distanceM = haversineMeters(payload.lat, payload.lng, loc.lat, loc.lng);
  if (distanceM > 500) {
    throw new Error(
      `google_place_id geometry mismatch (${Math.round(distanceM)}m) for ${payload.name ?? "court"}`,
    );
  }
}

async function attachPrimaryPhotoIfProvided(url, key, entity, entityId, rawCandidate) {
  const sourceImageUrl = normalizeText(rawCandidate?.image_url ?? rawCandidate?.imageUrl);
  if (!sourceImageUrl) return;

  const bucket =
    entity === "courts"
      ? process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images"
      : process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";
  const table = entity === "courts" ? "court_photos" : "group_photos";
  const idField = entity === "courts" ? "court_id" : "group_id";

  const uploadedPublicUrl = await uploadRemoteImageToBucket(url, key, bucket, entityId, sourceImageUrl);

  const photoPayload = {
    [idField]: entityId,
    image_url: uploadedPublicUrl,
    is_primary: true,
  };
  await postRow(url, key, table, photoPayload);
  console.log(`[intake] attached primary photo for ${entity}/${entityId}`);
}

async function uploadRemoteImageToBucket(url, key, bucket, entityId, sourceImageUrl) {
  const imageResponse = await fetch(sourceImageUrl, { cache: "no-store" });
  if (!imageResponse.ok) {
    throw new Error(`failed to fetch source image: ${sourceImageUrl} (${imageResponse.status})`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  const ext = pickImageExt(contentType, sourceImageUrl);
  const objectPath = `${entityId}/${Date.now()}-intake.${ext}`;
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${objectPath}`;

  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "x-upsert": "true",
      "Content-Type": contentType,
    },
    body: bytes,
  });

  if (!uploadResp.ok) {
    const text = await uploadResp.text();
    throw new Error(`storage upload failed: ${uploadResp.status} ${text}`);
  }

  return `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function pickImageExt(contentType, sourceImageUrl) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const lower = sourceImageUrl.toLowerCase();
  if (lower.includes(".webp")) return "webp";
  if (lower.includes(".png")) return "png";
  return "jpg";
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

async function enforceEncodingIntegrity(url, key, table, insertedRow, sourcePayload) {
  const textFields = table === "courts" ? COURT_TEXT_FIELDS : GROUP_TEXT_FIELDS;
  if (!hasSuspiciousText(insertedRow, textFields)) return insertedRow;

  const id = insertedRow.id;
  const patch = {};
  for (const field of textFields) {
    if (field in sourcePayload) patch[field] = sourcePayload[field];
  }
  patch.updated_at = new Date().toISOString();

  await patchRow(url, key, table, id, patch);
  const reloaded = await getRowById(url, key, table, id);
  if (hasSuspiciousText(reloaded, textFields)) {
    throw new Error(`encoding integrity check failed for ${table}/${id}`);
  }

  console.log(`[intake] repaired encoding artifact for ${table}/${id}`);
  return reloaded;
}

async function patchRow(url, key, table, id, patch) {
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
      "Content-Type": UTF8_JSON,
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`patch failed (${table}/${id}): ${response.status} ${text}`);
  }
}

async function getRowById(url, key, table, id) {
  const rows = await requestJson(url, key, `${table}?select=*&id=eq.${id}`);
  if (!rows.length) throw new Error(`missing row after write (${table}/${id})`);
  return rows[0];
}

function hasSuspiciousText(row, fields) {
  for (const field of fields) {
    if (typeof row[field] === "string" && SUSPICIOUS_TEXT_RE.test(row[field])) {
      return true;
    }
  }
  return false;
}

async function runEncodingAudit(url, key) {
  const courtRows = await requestJson(
    url,
    key,
    "courts?select=id,name,address,district,province,description,line_id",
  );
  const groupRows = await requestJson(
    url,
    key,
    "groups?select=id,name,description,phone,line_id",
  );

  const badCourts = courtRows.filter((row) => hasSuspiciousText(row, COURT_TEXT_FIELDS));
  const badGroups = groupRows.filter((row) => hasSuspiciousText(row, GROUP_TEXT_FIELDS));

  if (badCourts.length || badGroups.length) {
    for (const row of badCourts) {
      console.error(`[intake] suspicious court text: ${row.id} (${row.name ?? "unnamed"})`);
    }
    for (const row of badGroups) {
      console.error(`[intake] suspicious group text: ${row.id} (${row.name ?? "unnamed"})`);
    }
    throw new Error(`encoding audit failed: courts=${badCourts.length} groups=${badGroups.length}`);
  }
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
