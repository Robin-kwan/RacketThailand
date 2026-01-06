"use server";

import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for LINE QR helpers.",
  );
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

const GROUP_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_LINE_QR_BUCKET || "group-line-qr";

async function findExistingGroupLineQrPath(groupId: string) {
  const { data, error } = await adminClient.storage
    .from(GROUP_LINE_QR_BUCKET)
    .list(groupId, { limit: 20 });
  if (error || !data) {
    return null;
  }
  const match = data.find((item) => item.name.startsWith("line-qr"));
  if (!match) {
    return null;
  }
  return `${groupId}/${match.name}`;
}

export async function ensureGroupLineQrUrl(
  groupId: string,
  currentUrl?: string | null,
): Promise<string | null> {
  if (currentUrl) {
    return currentUrl;
  }
  const path = await findExistingGroupLineQrPath(groupId);
  if (!path) {
    return null;
  }
  const {
    data: { publicUrl },
  } = adminClient.storage.from(GROUP_LINE_QR_BUCKET).getPublicUrl(path);
  await adminClient
    .from("groups")
    .update({ line_qr_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", groupId);
  return publicUrl;
}
