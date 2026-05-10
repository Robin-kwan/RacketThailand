import type { MetadataRoute } from "next";
import { getThailandTodayDateString } from "@/lib/casual-play";
import { supabaseSelect } from "@/lib/supabaseRest";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

type MinimalEntity = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type CommunityPostEntity = MinimalEntity & {
  sports?: {
    code: string | null;
  } | null;
};

function toSitemapDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getEntityLastModified(entity: MinimalEntity) {
  return toSitemapDate(entity.updated_at ?? entity.created_at);
}

function buildLocalizedSitemapEntries({
  path,
  lastModified,
  changeFrequency,
  priority,
}: {
  path: string;
  lastModified?: SitemapEntry["lastModified"];
  changeFrequency?: SitemapEntry["changeFrequency"];
  priority?: number;
}): MetadataRoute.Sitemap {
  const languages = buildLocaleAlternates(path);

  return SUPPORTED_LOCALES.map((locale: Locale) => ({
    url: buildCanonicalUrl(path, locale),
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages,
    },
  }));
}

async function fetchEntities<T extends MinimalEntity>(
  table: "courts" | "groups" | "casual_plays" | "community_posts",
  limit = 1000,
  filters: Record<string, string> = {},
  select = "id,created_at,updated_at",
) {
  try {
    const { data } = await supabaseSelect<T>(
      table,
      {
        select,
        ...filters,
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
  const today = getThailandTodayDateString();
  const [courts, groups, casualPlays, communityPosts] = await Promise.all([
    fetchEntities("courts", 1000, { is_active: "eq.true" }),
    fetchEntities("groups"),
    fetchEntities("casual_plays", 1000, { play_date: `gte.${today}` }),
    fetchEntities<CommunityPostEntity>(
      "community_posts",
      1000,
      { status: "eq.published" },
      "id,created_at,updated_at,sports(code)",
    ),
  ]);

  const staticRoutes = [
    ...buildLocalizedSitemapEntries({
      path: "/",
      changeFrequency: "weekly",
      priority: 1,
    }),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}`,
        changeFrequency: "weekly",
        priority: 0.9,
      }),
    ),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}/court-finder`,
        changeFrequency: "daily",
        priority: 0.85,
      }),
    ),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}/group-finder`,
        changeFrequency: "daily",
        priority: 0.8,
      }),
    ),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}/casual-plays`,
        changeFrequency: "daily",
        priority: 0.8,
      }),
    ),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}/board`,
        changeFrequency: "daily",
        priority: 0.75,
      }),
    ),
  ];

  const courtRoutes = courts.flatMap((court) =>
    buildLocalizedSitemapEntries({
      path: `/courts/${court.id}`,
      lastModified: getEntityLastModified(court),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const groupRoutes = groups.flatMap((group) =>
    buildLocalizedSitemapEntries({
      path: `/groups/${group.id}`,
      lastModified: getEntityLastModified(group),
      changeFrequency: "weekly",
      priority: 0.65,
    }),
  );

  const casualPlayRoutes = casualPlays.flatMap((play) =>
    buildLocalizedSitemapEntries({
      path: `/casual-plays/${play.id}`,
      lastModified: getEntityLastModified(play),
      changeFrequency: "daily",
      priority: 0.6,
    }),
  );

  const communityPostRoutes = communityPosts.flatMap((post) => {
    const sportCode = post.sports?.code;
    if (!sportCode || !SUPPORTED_SPORTS.some((code) => code === sportCode)) {
      return [];
    }

    return buildLocalizedSitemapEntries({
      path: `/${sportCode}/board/${post.id}`,
      lastModified: getEntityLastModified(post),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  });

  return [
    ...staticRoutes,
    ...courtRoutes,
    ...groupRoutes,
    ...casualPlayRoutes,
    ...communityPostRoutes,
  ];
}
