import type { Metadata } from "next";
import { LocationDirectoryLinks } from "@/components/location-directory-links";
import { notFound } from "next/navigation";
import {
  GroupFinder,
  GroupFinderNearbyTodayButton,
} from "@/components/group-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import { getTranslator, normalizeLocale } from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { getSportDiscoveryCopy } from "@/lib/sport-discovery-copy";
import { getGroupContributionAction } from "@/lib/group-contribution";
import { getRequestUser } from "@/lib/supabase-server-auth";
import { fetchGroupsBySport } from "@/server/groupFinder";
import { fetchOwnedGroupSummaries } from "@/server/ownedGroups";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = {
  lang?: string;
  search?: string;
  date?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  playFormat?: string;
  allowWalkIn?: string;
};
type SearchParamsInput = Promise<SearchParams> | undefined;

function sanitizeQueryParam(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type DayKey = (typeof DAY_KEYS)[number];

function isDayKey(value: string): value is DayKey {
  return DAY_KEYS.includes(value as DayKey);
}

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const meta = getSportMeta(resolvedParams.sport);
  if (!meta) {
    return {
      title: "Group finder | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const dateFilter = sanitizeQueryParam(resolvedSearch?.date);
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasActiveFilters = Boolean(
    searchQuery ||
    dateFilter ||
    dayFilter ||
    startTimeFilter ||
    endTimeFilter ||
    playFormatFilter ||
    walkInFilter,
  );
  const canonicalPath = `/${resolvedParams.sport}/group-finder`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const discoveryCopy = getSportDiscoveryCopy(resolvedParams.sport, locale);
  const title =
    discoveryCopy?.groupFinderTitle ??
    `Find ${meta.name[locale]} groups | RacketThailand`;
  const description =
    discoveryCopy?.groupFinderDescription ??
    `Find ${meta.name[locale]} groups in Thailand with schedules, venues, and contact details.`;

  const metaDescription = truncateMetaDescription(description);
  const finderPreviewImage = buildAbsoluteUrl(meta.coverImage);
  const finderPreviewAlt =
    locale === "th"
      ? `ค้นหากลุ่ม${meta.name[locale]}บน RacketThailand`
      : `Find ${meta.name[locale]} groups on RacketThailand`;

  return {
    title,
    description: metaDescription,
    robots: hasActiveFilters
      ? {
          index: false,
          follow: true,
        }
      : undefined,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description: metaDescription,
      url: canonical,
      type: "website",
      images: [
        {
          url: finderPreviewImage,
          alt: finderPreviewAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [finderPreviewImage],
    },
  };
}

export default async function GroupFinderPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const meta = getSportMeta(resolvedParams.sport);
  if (!meta) {
    notFound();
  }

  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const dateFilter = sanitizeQueryParam(resolvedSearch?.date);
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasActiveFilters = Boolean(
    searchQuery ||
      dateFilter ||
      dayFilter ||
      startTimeFilter ||
      endTimeFilter ||
      playFormatFilter ||
      walkInFilter,
  );
  const [groupData, user] = await Promise.all([
    fetchGroupsBySport(
      resolvedParams.sport,
      {
        search: searchQuery || undefined,
        date: dateFilter || undefined,
        day: isDayKey(dayFilter) ? dayFilter : undefined,
        startTime: startTimeFilter || undefined,
        endTime: endTimeFilter || undefined,
        playFormat: playFormatFilter || undefined,
        allowWalkIn: walkInFilter || undefined,
        limit: 12,
        prioritizeUpcoming: true,
      },
      locale,
    ),
    getRequestUser(),
  ]);
  if (!groupData.sport) {
    notFound();
  }
  const ownedGroups =
    user && !user.is_anonymous
      ? await fetchOwnedGroupSummaries(user.id, resolvedParams.sport)
      : [];
  const groupAction = getGroupContributionAction({
    ownedGroups,
    locale,
    sportCode: resolvedParams.sport,
  });
  const groupActionLabel =
    groupAction.kind === "create_group"
      ? t("header.createGroup")
      : t("groups.contribution.addSession");

  const dayLabels = DAY_KEYS.reduce<Record<string, string>>((acc, day) => {
    acc[day] = t(`groups.days.${day}`);
    return acc;
  }, {});

  const discoveryCopy = getSportDiscoveryCopy(resolvedParams.sport, locale);
  const copy = {
    title:
      discoveryCopy?.groupFinderTitle.replace(" | RacketThailand", "") ??
      `Find ${meta.name[locale]} groups`,
    subtitle: t("groupFinder.subtitle"),
    searchPlaceholder: t("groupFinder.searchPlaceholder"),
    reset: t("groupFinder.reset"),
    emptyTitle: t("groupFinder.emptyTitle"),
    emptyDescription: t("groupFinder.emptyDescription"),
    backLink: t("groupFinder.backLink"),
    sessionsLabel: t("groupFinder.sessionsLabel"),
    scheduleAnytime: t("groupFinder.scheduleAnytime"),
    dateFilterLabel: t("groupFinder.dateFilterLabel"),
    dayFilterLabel: t("groupFinder.dayFilterLabel"),
    anyDayLabel: t("groupFinder.anyDayLabel"),
    startTimeLabel: t("groupFinder.startTimeLabel"),
    endTimeLabel: t("groupFinder.endTimeLabel"),
    timeClearLabel: t("groupFinder.timeClearLabel"),
    playFormatFilterLabel: t("groupFinder.playFormatFilterLabel"),
    anyPlayFormatLabel: t("groupFinder.anyPlayFormatLabel"),
    playFormatSingle: t("groups.form.playFormatSingle"),
    playFormatDouble: t("groups.form.playFormatDouble"),
    walkInFilterLabel: t("groupFinder.walkInFilterLabel"),
    anyWalkInLabel: t("groupFinder.anyWalkInLabel"),
    walkInsWelcome: t("groups.detail.walkInsWelcome"),
    walkInsClosed: t("groups.detail.walkInsClosed"),
    nearbyButton: t("groupFinder.nearbyButton"),
    nearbyTodayButton: t("groupFinder.nearbyTodayButton"),
    nearbyFinding: t("groupFinder.nearbyFinding"),
    nearbyClear: t("groupFinder.nearbyClear"),
    nearbyUnsupported: t("groupFinder.nearbyUnsupported"),
    nearbyDenied: t("groupFinder.nearbyDenied"),
    nearbyActive: t("groupFinder.nearbyActive"),
    distanceLabel: t("groupFinder.distanceLabel"),
    mapHeading: t("groupFinder.mapHeading"),
    nearbyListTitle: t("groupFinder.nearbyListTitle"),
    openMaps: t("groupFinder.openMaps"),
    playerAmountLabel: t("groups.detail.playerAmount"),
    phoneLabel: t("groups.detail.phone"),
    lineLabel: t("groups.detail.line"),
    createGroupCta: groupActionLabel,
    playerFinderCta: t("header.playerFinder"),
    filtersLabel: t("groupFinder.filtersLabel"),
    moreFiltersTitle: t("groupFinder.moreFiltersTitle"),
    applyFiltersLabel: t("groupFinder.applyFiltersLabel"),
    closeFiltersLabel: t("groupFinder.closeFiltersLabel"),
    removeFilterLabel: t("groupFinder.removeFilterLabel"),
    loadMoreLabel: t("groupFinder.loadMore"),
    loadingMoreLabel: t("groupFinder.loadingMore"),
    searchError: t("finderFeedback.searchError"),
    loadMoreError: t("finderFeedback.loadMoreError"),
    retryLabel: t("finderFeedback.retry"),
    loadingLabel: t("finderFeedback.loading"),
  };
  const groupFinderUrl = buildCanonicalUrl(
    `/${resolvedParams.sport}/group-finder`,
    locale,
  );
  const collectionSchema =
    !hasActiveFilters && groupData.groups.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": groupFinderUrl,
          url: groupFinderUrl,
          name: copy.title,
          description: copy.subtitle,
          inLanguage: locale === "th" ? "th-TH" : "en",
          mainEntity: {
            "@type": "ItemList",
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: groupData.count,
            itemListElement: groupData.groups.map((group, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: group.name,
              url: buildCanonicalUrl(`/groups/${group.id}`, locale),
            })),
          },
        }
      : null;

  return (
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        {collectionSchema && (
          <script
            id={`group-finder-schema-${resolvedParams.sport}-${locale}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={copy.title}
          description={copy.subtitle}
        >
          <GroupFinderNearbyTodayButton label={copy.nearbyTodayButton} />
          <TrackedLink
            href={groupAction.href}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "group_finder_header",
              cta: groupAction.kind,
              sport: resolvedParams.sport,
            }}
            className="rt-btn-group inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            {groupActionLabel}
          </TrackedLink>
        </SportFinderHero>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <LocationDirectoryLinks sport={resolvedParams.sport} kind="groups" locale={locale} compact />
            <GroupFinder
              sportCode={resolvedParams.sport}
              locale={locale}
              fallbackImage={meta.coverImage}
              copy={copy}
              dayLabels={dayLabels}
              initialGroups={groupData.groups}
              initialNow={new Date().toISOString()}
              total={groupData.count}
              groupActionHref={groupAction.href}
              groupActionKind={groupAction.kind}
              initialSearch={searchQuery}
              initialDate={dateFilter}
              initialDay={isDayKey(dayFilter) ? dayFilter : ""}
              initialStartTime={startTimeFilter}
              initialEndTime={endTimeFilter}
              initialPlayFormat={playFormatFilter}
              initialAllowWalkIn={walkInFilter}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
