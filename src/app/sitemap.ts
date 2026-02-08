import type { MetadataRoute } from "next";
import { supabaseSelect } from "@/lib/supabaseRest";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://racketthailand.com";

type MinimalEntity = {
  id: string;
  updated_at?: string | null;
};

async function fetchEntities(
  table: "courts" | "groups",
  limit = 1000,
) {
  try {
    const { data } = await supabaseSelect<MinimalEntity>(
      table,
      {
        select: "id,updated_at",
        order: "updated_at.desc.nullslast",
        limit: limit.toString(),
      },
      { preferCount: false },
    );
    return data ?? [];
  } catch (error) {
    console.error(`Failed to fetch ${table} for sitemap`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courts, groups] = await Promise.all([
    fetchEntities("courts"),
    fetchEntities("groups"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date() },
    { url: `${BASE_URL}/courts`, lastModified: new Date() },
    { url: `${BASE_URL}/groups`, lastModified: new Date() },
    ...SUPPORTED_SPORTS.map((code) => ({
      url: `${BASE_URL}/${code}`,
      lastModified: new Date(),
    })),
  ];

  const courtRoutes: MetadataRoute.Sitemap = courts.map((court) => ({
    url: `${BASE_URL}/courts/${court.id}`,
    lastModified: court.updated_at ? new Date(court.updated_at) : new Date(),
  }));

  const groupRoutes: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${BASE_URL}/groups/${group.id}`,
    lastModified: group.updated_at ? new Date(group.updated_at) : new Date(),
  }));

  return [...staticRoutes, ...courtRoutes, ...groupRoutes];
}
