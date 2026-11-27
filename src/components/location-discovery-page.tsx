import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSportMeta } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
} from "@/lib/seo";
import {
  LOCATION_PAGE_SIZE,
  locationPath,
  parseLocationPage,
  type LocationKind,
} from "@/lib/location-directory";
import { fetchLocationDirectory } from "@/server/locationDirectory";
import { getLocationGroupSessions } from "@/lib/location-group-sessions";
import { fetchPublicCourtsByIds } from "@/server/courtFinder";
import { fetchGroupsBySport } from "@/server/groupFinder";
import { SCHEDULE_DAYS } from "@/lib/schedule-normalization";
import { getRequestUser } from "@/lib/supabase-server-auth";
import { getGroupContributionAction } from "@/lib/group-contribution";
import { fetchOwnedGroupSummaries } from "@/server/ownedGroups";
import { CourtCard } from "@/components/court-card";
import { GroupCard } from "@/components/group-card";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { LocationDirectoryLinks } from "@/components/location-directory-links";
import { courtPriceSummary } from "@/lib/court-price-summary";

export type LocationPageProps = {
  params: Promise<{ sport: string; province: string }>;
  searchParams: Promise<{ lang?: string; page?: string | string[] }>;
};

const loadPage = cache(
  async (
    sport: string,
    slug: string,
    kind: LocationKind,
    page: number,
    locale: Locale,
  ) => {
    const meta = getSportMeta(sport);
    if (!meta) notFound();
    const directory = await fetchLocationDirectory();
    const location = directory.find(
      (entry) => entry.sport === sport && entry.slug === slug,
    );
    if (!location) notFound();
    const ids = kind === "courts" ? location.courtIds : location.groupIds;
    const totalPages = Math.ceil(ids.length / LOCATION_PAGE_SIZE);
    if (page > totalPages) notFound();
    const selectedIds = ids.slice(
      (page - 1) * LOCATION_PAGE_SIZE,
      page * LOCATION_PAGE_SIZE,
    );
    const [courts, groups, t] = await Promise.all([
      kind === "courts"
        ? fetchPublicCourtsByIds(selectedIds, locale)
        : Promise.resolve([]),
      kind === "groups"
        ? fetchGroupsBySport(
            sport,
            {
              ids: selectedIds,
              limit: LOCATION_PAGE_SIZE,
              includeUpcomingEvents: true,
            },
            locale,
          ).then((result) => result.groups)
        : Promise.resolve([]),
      getTranslator(locale),
    ]);
    if (courts.length + groups.length === 0) notFound();
    const titleKey =
      kind === "courts"
        ? sport === "tabletennis"
          ? "tabletennisCourtTitle"
          : "courtTitle"
        : sport === "badminton"
          ? "badmintonGroupTitle"
          : "groupTitle";
    const values = {
      sport: meta.name[locale],
      location: location.name[locale],
    };
    return {
      meta,
      location,
      courts,
      groups,
      total: ids.length,
      totalPages,
      title: t(`locationDiscovery.${titleKey}`, values),
      description: t(
        `locationDiscovery.${kind === "courts" ? "courtDescription" : "groupDescription"}`,
        {
          ...values,
          sport: locale === "en" ? values.sport.toLowerCase() : values.sport,
        },
      ),
      path: locationPath(sport, kind, slug, page),
    };
  },
);

async function resolvePage(props: LocationPageProps, kind: LocationKind) {
  const [params, search] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const page = parseLocationPage(search.page);
  if (!page) notFound();
  const locale = normalizeLocale(search.lang);
  return {
    ...(await loadPage(params.sport, params.province, kind, page, locale)),
    page,
    locale,
  };
}

export async function locationMetadata(
  props: LocationPageProps,
  kind: LocationKind,
): Promise<Metadata> {
  const data = await resolvePage(props, kind);
  const t = await getTranslator(data.locale);
  const title = `${data.title}${data.page > 1 ? ` · ${t("locationDiscovery.pageTitle", { page: data.page })}` : ""} | RacketThailand`;
  return {
    title,
    description: data.description,
    alternates: {
      canonical: buildCanonicalUrl(data.path, data.locale),
      languages: buildLocaleAlternates(data.path),
    },
    openGraph: {
      title,
      description: data.description,
      url: buildCanonicalUrl(data.path, data.locale),
      type: "website",
      images: [buildAbsoluteUrl(data.meta.coverImage)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: data.description,
      images: [buildAbsoluteUrl(data.meta.coverImage)],
    },
  };
}

export async function LocationDiscoveryPage({
  kind,
  ...props
}: LocationPageProps & { kind: LocationKind }) {
  const data = await resolvePage(props, kind);
  const { meta, location, locale, page, courts, groups } = data;
  const t = await getTranslator(locale);
  const rootPath = `/${meta.code}/${kind === "courts" ? "court-finder" : "group-finder"}`;
  let action = {
    href: buildLocalizedPath(`/courts/new?sport=${meta.code}`, locale),
    kind: "add_court",
    label: t("courtSubmission.submit"),
  };
  if (kind === "groups") {
    const user = await getRequestUser();
    const ownedGroups =
      user && !user.is_anonymous
        ? await fetchOwnedGroupSummaries(user.id, meta.code)
        : [];
    const contribution = getGroupContributionAction({
      ownedGroups,
      sportCode: meta.code,
      locale,
    });
    action = {
      ...contribution,
      label: t(
        contribution.kind === "create_group"
          ? "header.createGroup"
          : "groups.contribution.addSession",
      ),
    };
  }
  const dayLabels = Object.fromEntries(
    SCHEDULE_DAYS.map((day) => [day, t(`groups.days.${day}`)]),
  );
  const otherKind = kind === "courts" ? "groups" : "courts";
  const otherCount =
    kind === "courts" ? location.groupIds.length : location.courtIds.length;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: data.title,
    description: data.description,
    url: buildCanonicalUrl(data.path, locale),
    inLanguage: locale === "th" ? "th-TH" : "en",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: courts.length + groups.length,
      itemListElement: [...courts, ...groups].map((item, index) => ({
        "@type": "ListItem",
        position: (page - 1) * LOCATION_PAGE_SIZE + index + 1,
        name: item.name,
        url: buildCanonicalUrl(`/${kind}/${item.id}`, locale),
      })),
    },
  };
  return (
    <div className="min-h-screen bg-[var(--rt-surface-soft)] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <div>
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={data.title}
          description={data.description}
        >
          <TrackedLink
            href={action.href}
            eventName="sport_cta_click"
            eventPayload={{
              surface: `${kind === "courts" ? "court" : "group"}_location_header`,
              cta: action.kind,
              sport: meta.code,
            }}
            className={`${kind === "courts" ? "rt-btn-court" : "rt-btn-group"} inline-flex items-center justify-center px-5 py-3 text-sm`}
          >
            {action.label}
          </TrackedLink>
        </SportFinderHero>
        <section className="mx-auto max-w-screen-xl px-6 py-8 md:px-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {t(
                `locationDiscovery.${kind === "courts" ? "courtCount" : "groupCount"}`,
                { count: data.total },
              )}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                className="underline underline-offset-4"
                href={buildLocalizedPath(rootPath, locale)}
              >
                {t(
                  `locationDiscovery.${kind === "courts" ? "allCourts" : "allGroups"}`,
                )}
              </Link>
              {otherCount > 0 && (
                <Link
                  className="underline underline-offset-4"
                  href={buildLocalizedPath(
                    locationPath(meta.code, otherKind, location.slug),
                    locale,
                  )}
                >
                  {t(
                    `locationDiscovery.${kind === "courts" ? "nearbyGroups" : "nearbyCourts"}`,
                    { location: location.name[locale] },
                  )}
                </Link>
              )}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => {
              const priceSummary = courtPriceSummary(court.price_note);
              const photo =
                court.court_photos?.find((item) => item.is_primary)?.image_url ??
                court.court_photos?.[0]?.image_url;
              return (
                <CourtCard
                key={court.id}
                name={
                  court.name ??
                  t("courtFinder.title", { sport: meta.name[locale] })
                }
                href={buildLocalizedPath(
                  `/courts/${court.id}?sport=${meta.code}`,
                  locale,
                )}
                imageUrl={photo ?? meta.coverImage}
                imagePlaceholderLabel={photo ? undefined : t("courtFinder.noPhoto")}
                imageAspectClass="aspect-[8/5]"
                location={[court.district, court.province]
                  .filter(Boolean)
                  .join(", ")}
                details={priceSummary ? [`${t("courtFinder.price")}: ${priceSummary}`] : []}
                openInNewTab={false}
                />
              );
            })}
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name ?? data.title}
                href={buildLocalizedPath(
                  `/groups/${group.id}?sport=${meta.code}`,
                  locale,
                )}
                imageUrl={
                  group.group_photos?.find((photo) => photo.is_primary)
                    ?.image_url ??
                  group.group_photos?.[0]?.image_url ??
                  meta.coverImage
                }
                description={group.description}
                location={location.name[locale]}
                sessions={getLocationGroupSessions(
                  group.group_sessions ?? [],
                  group.group_events ?? [],
                  location,
                )}
                playFormat={group.play_format}
                allowWalkIn={group.allow_walk_in}
                dayLabels={dayLabels}
                scheduleAnytime={t("groupFinder.scheduleAnytime")}
                locale={locale}
                courtSportCode={meta.code}
                showSessions
              />
            ))}
          </div>
          {data.totalPages > 1 && (
            <nav
              aria-label={t("locationDiscovery.pagination")}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              {page > 1 && (
                <Link
                  rel="prev"
                  prefetch={false}
                  className="rt-pill px-4 py-3"
                  href={buildLocalizedPath(
                    locationPath(meta.code, kind, location.slug, page - 1),
                    locale,
                  )}
                >
                  {t("locationDiscovery.previous")}
                </Link>
              )}
              <span className="text-sm">
                {t("locationDiscovery.page", { page, total: data.totalPages })}
              </span>
              {page < data.totalPages && (
                <Link
                  rel="next"
                  prefetch={false}
                  className="rt-btn-primary px-4 py-3"
                  href={buildLocalizedPath(
                    locationPath(meta.code, kind, location.slug, page + 1),
                    locale,
                  )}
                >
                  {t("locationDiscovery.next")}
                </Link>
              )}
            </nav>
          )}
          <LocationDirectoryLinks
            sport={meta.code}
            kind={kind}
            locale={locale}
          />
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      </div>
    </div>
  );
}
