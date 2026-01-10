import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ViewCounts = {
  courts: Record<string, number>;
  groups: Record<string, number>;
};

const VIEW_BUCKET =
  process.env.SUPABASE_VIEW_COUNT_BUCKET ?? "view-counts-store";
const OBJECT_KEY = "counts.json";

const DEFAULT_COUNTS: ViewCounts = { courts: {}, groups: {} };

async function ensureBucket() {
  const client = getSupabaseAdminClient();
  const { data } = await client.storage.getBucket(VIEW_BUCKET);
  if (!data) {
    await client.storage.createBucket(VIEW_BUCKET, {
      public: false,
    });
  }
}

async function downloadCounts(): Promise<ViewCounts> {
  const client = getSupabaseAdminClient();
  await ensureBucket();
  const { data } = await client.storage
    .from(VIEW_BUCKET)
    .download(OBJECT_KEY);
  if (!data) {
    return { ...DEFAULT_COUNTS };
  }
  try {
    const text = await data.text();
    return JSON.parse(text) as ViewCounts;
  } catch {
    return { ...DEFAULT_COUNTS };
  }
}

async function uploadCounts(counts: ViewCounts) {
  const client = getSupabaseAdminClient();
  const payload = Buffer.from(JSON.stringify(counts), "utf-8");
  await client.storage.from(VIEW_BUCKET).upload(OBJECT_KEY, payload, {
    contentType: "application/json",
    upsert: true,
  });
}

export async function incrementViewCount(
  entity: "court" | "group",
  entityId: string,
) {
  const bucketKey = entity === "court" ? "courts" : "groups";
  const counts = await downloadCounts();
  counts[bucketKey][entityId] = (counts[bucketKey][entityId] ?? 0) + 1;
  await uploadCounts(counts);
  return counts[bucketKey][entityId];
}

export async function getViewCounts(): Promise<ViewCounts> {
  return downloadCounts();
}
