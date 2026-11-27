import type { MetadataRoute } from "next";
import { supabaseSelect } from "@/lib/supabaseRest";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { PRODUCT_UPDATES } from "@/data/productUpdates";
import { fetchLocationNavigation } from "@/server/locationDirectory";
import { locationPath } from "@/lib/location-directory";

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

type TournamentEntity = MinimalEntity & { tournament_end_at?: string | null };

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
  table: "courts" | "groups" | "community_posts" | "tournaments",
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
  const [courts, groups, communityPosts, tournaments, locations] = await Promise.all([
    fetchEntities("courts", 1000, { is_active: "eq.true" }),
    fetchEntities("groups", 1000, { status: "eq.published" }),
    fetchEntities<CommunityPostEntity>(
      "community_posts",
      1000,
      { status: "eq.published" },
      "id,created_at,updated_at,sports(code)",
    ),
    fetchEntities<TournamentEntity>("tournaments", 1000, {
      status: "eq.published",
      tournament_end_at: `gte.${new Date().toISOString()}`,
    }, "id,created_at,updated_at,tournament_end_at"),
    fetchLocationNavigation(),
  ]);

  const staticRoutes = [
    ...buildLocalizedSitemapEntries({
      path: "/",
      changeFrequency: "weekly",
      priority: 1,
    }),
    ...buildLocalizedSitemapEntries({
      path: "/terms",
      changeFrequency: "monthly",
      priority: 0.3,
    }),
    ...buildLocalizedSitemapEntries({
      path: "/updates",
      lastModified: new Date(PRODUCT_UPDATES[0].releasedAt),
      changeFrequency: "weekly",
      priority: 0.4,
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
        path: `/${code}/tournaments`,
        changeFrequency: "daily",
        priority: 0.8,
      }),
    ),
    ...SUPPORTED_SPORTS.flatMap((code) =>
      buildLocalizedSitemapEntries({
        path: `/${code}/players`,
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

  const tournamentRoutes = tournaments.flatMap((tournament) =>
    buildLocalizedSitemapEntries({
      path: `/tournaments/${tournament.id}`,
      lastModified: getEntityLastModified(tournament),
      changeFrequency: "daily",
      priority: 0.7,
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
    ...locations.flatMap((location) => [
      ...(location.courtIds.length > 0 ? buildLocalizedSitemapEntries({
        path: locationPath(location.sport, "courts", location.slug),
        changeFrequency: "weekly", priority: 0.75,
      }) : []),
      ...(location.groupIds.length > 0 ? buildLocalizedSitemapEntries({
        path: locationPath(location.sport, "groups", location.slug),
        changeFrequency: "weekly", priority: 0.7,
      }) : []),
    ]),
    ...courtRoutes,
    ...groupRoutes,
    ...tournamentRoutes,
    ...communityPostRoutes,
  ];
}
