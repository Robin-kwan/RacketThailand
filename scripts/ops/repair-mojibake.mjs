#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const MOJIBAKE_RE = /à¸|à¹|Ã.|Â./u;
const THAI_RE = /[\u0E00-\u0E7F]/u;

main().catch((error) => {
  console.error(`[repair] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

async function main() {
  loadDotEnvLocal();
  const supabaseUrl = mustEnv("SUPABASE_URL");
  const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const now = new Date().toISOString();

  const courtFields = ["name", "address", "district", "province", "description", "line_id"];
  const groupFields = ["name", "description", "phone", "line_id"];

  const [courts, groups] = await Promise.all([
    requestJson(
      supabaseUrl,
      serviceRoleKey,
      "courts?select=id,name,address,district,province,description,line_id",
    ),
    requestJson(
      supabaseUrl,
      serviceRoleKey,
      "groups?select=id,name,description,phone,line_id",
    ),
  ]);

  let courtPatched = 0;
  let groupPatched = 0;

  for (const row of courts) {
    const patch = buildPatch(row, courtFields);
    if (Object.keys(patch).length === 0) continue;
    patch.updated_at = now;
    await patchRow(supabaseUrl, serviceRoleKey, "courts", row.id, patch);
    courtPatched += 1;
  }

  for (const row of groups) {
    const patch = buildPatch(row, groupFields);
    if (Object.keys(patch).length === 0) continue;
    patch.updated_at = now;
    await patchRow(supabaseUrl, serviceRoleKey, "groups", row.id, patch);
    groupPatched += 1;
  }

  console.log(`[repair] patched courts=${courtPatched} groups=${groupPatched}`);
}

function buildPatch(row, fields) {
  const patch = {};
  for (const field of fields) {
    const value = row[field];
    if (typeof value !== "string") continue;
    if (!MOJIBAKE_RE.test(value)) continue;
    const repaired = tryRepair(value);
    if (repaired && repaired !== value) {
      patch[field] = repaired;
    }
  }
  return patch;
}

function tryRepair(value) {
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8").normalize("NFC");
    if (!THAI_RE.test(repaired)) return null;
    if (MOJIBAKE_RE.test(repaired)) return null;
    return repaired;
  } catch {
    return null;
  }
}

async function patchRow(url, key, table, id, patch) {
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`patch failed ${table}/${id}: ${response.status} ${text}`);
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

function loadDotEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return;
  const text = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
