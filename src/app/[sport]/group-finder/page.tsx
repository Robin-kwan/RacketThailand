import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupFinder } from "@/components/group-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { getSeoKeyword } from "@/lib/seoKeywords";
import { fetchGroupsBySport } from "@/server/groupFinder";

const FINDER_PREVIEW_IMAGE = buildAbsoluteUrl("/sports/badminton.png");

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

function buildFinderPath(
  basePath: string,
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
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

function getThaiGroupFinderIntent(sportCode: string, sportName: string) {
  const playVerbSports = new Set(["padel", "pickleball"]);
  const verb = playVerbSports.has(sportCode) ? "เล่น" : "ตี";
  return `หาเพื่อน${verb}${sportName}`;
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
  const t = await getTranslator(locale);
  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const dateFilter = sanitizeQueryParam(resolvedSearch?.date);
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasFreeTextSearch = Boolean(searchQuery);
  const stableQuery = hasFreeTextSearch
    ? {}
    : {
        date: dateFilter || undefined,
        day: isDayKey(dayFilter) ? dayFilter : undefined,
        startTime: startTimeFilter || undefined,
        endTime: endTimeFilter || undefined,
        playFormat:
          playFormatFilter === "single" || playFormatFilter === "double"
            ? playFormatFilter
            : undefined,
        allowWalkIn:
          walkInFilter === "true" || walkInFilter === "false"
            ? walkInFilter
            : undefined,
      };
  const canonicalPath = buildFinderPath(
    `/${resolvedParams.sport}/group-finder`,
    stableQuery,
  );
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const thaiIntent = getThaiGroupFinderIntent(
    resolvedParams.sport,
    meta.name.th,
  );
  const title =
    locale === "th"
      ? `ค้นหากลุ่ม${meta.name[locale]}และ${thaiIntent} | RacketThailand`
      : `${meta.name[locale]} Group Finder | RacketThailand`;
  const seoKeyword = getSeoKeyword(resolvedParams.sport, locale, "groups");
  const description =
    locale === "th"
      ? `ค้นหากลุ่ม${meta.name[locale]}และโพสต์${thaiIntent}ที่เปิดรับสมาชิก พร้อมวันเวลาเล่นและข้อมูลติดต่อจากทั่วประเทศไทย ${seoKeyword}`
      : `Find active ${meta.name[locale]} groups in Thailand with schedules, contacts, and nearby map context.`;

  const validDayFilter = isDayKey(dayFilter) ? dayFilter : "";
  const filterParts = [
    dateFilter,
    validDayFilter ? t(`groups.days.${validDayFilter}`) : "",
    playFormatFilter === "single" ? t("groups.form.playFormatSingle") : "",
    playFormatFilter === "double" ? t("groups.form.playFormatDouble") : "",
    walkInFilter === "true" ? t("groups.detail.walkInsWelcome") : "",
    walkInFilter === "false" ? t("groups.detail.walkInsClosed") : "",
    startTimeFilter && endTimeFilter
      ? `${startTimeFilter}-${endTimeFilter}`
      : startTimeFilter || endTimeFilter,
  ].filter(Boolean);
  const filterSummary = filterParts.join(locale === "th" ? " • " : " • ");
  const filteredTitle = searchQuery
    ? locale === "th"
      ? `ผลการค้นหากลุ่ม${meta.name[locale]} "${searchQuery}" | RacketThailand`
      : `${meta.name[locale]} groups matching "${searchQuery}" | RacketThailand`
    : filterSummary
      ? locale === "th"
        ? `กลุ่ม${meta.name[locale]}: ${filterSummary} | RacketThailand`
        : `${meta.name[locale]} groups: ${filterSummary} | RacketThailand`
      : title;
  const filteredDescription = searchQuery
    ? locale === "th"
      ? `ดูผลการค้นหากลุ่ม${meta.name[locale]}และโพสต์${thaiIntent}ที่เกี่ยวข้องกับ "${searchQuery}" พร้อมวันเวลาเล่นและข้อมูลติดต่อ ${seoKeyword}`
      : `Browse ${meta.name[locale]} group results matching "${searchQuery}" with schedules and contact details.`
    : filterSummary
      ? locale === "th"
        ? `ค้นหากลุ่ม${meta.name[locale]}และ${thaiIntent}ตามตัวกรอง ${filterSummary} พร้อมวันเวลาเล่นและข้อมูลติดต่อ ${seoKeyword}`
        : `Find ${meta.name[locale]} groups filtered by ${filterSummary}, with schedules and contact details.`
      : description;
  const metaDescription = truncateMetaDescription(filteredDescription);

  return {
    title: filteredTitle,
    description: metaDescription,
    robots: hasFreeTextSearch
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
      title: filteredTitle,
      description: metaDescription,
      url: canonical,
      type: "website",
      images: [
        {
          url: FINDER_PREVIEW_IMAGE,
          alt: "RacketThailand badminton court preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: filteredTitle,
      description: metaDescription,
      images: [FINDER_PREVIEW_IMAGE],
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
  const groupData = await fetchGroupsBySport(resolvedParams.sport, {
    search: searchQuery || undefined,
    date: dateFilter || undefined,
    day: isDayKey(dayFilter) ? dayFilter : undefined,
    startTime: startTimeFilter || undefined,
    endTime: endTimeFilter || undefined,
    playFormat: playFormatFilter || undefined,
    allowWalkIn: walkInFilter || undefined,
    limit: 12,
  }, locale);
  if (!groupData.sport) {
    notFound();
  }

  const dayLabels = DAY_KEYS.reduce<Record<string, string>>(
    (acc, day) => {
      acc[day] = t(`groups.days.${day}`);
      return acc;
    },
    {},
  );

  const copy = {
    title: t("groupFinder.title", { sport: meta.name[locale] }),
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
    createGroupCta: t("header.createGroup"),
    casualPlaysCta: t("sport.casualPlaysCta"),
  };

  return (
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={copy.title}
          description={copy.subtitle}
        >
          <TrackedLink
            href={buildLocalizedPath(`/${resolvedParams.sport}/casual-plays`, locale)}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "group_finder_header",
              cta: "open_casual_plays",
              sport: resolvedParams.sport,
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/45 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/80 hover:bg-white/20"
          >
            {copy.casualPlaysCta}
          </TrackedLink>
          <TrackedLink
            href={buildLocalizedPath(
              `/groups/create?sport=${encodeURIComponent(resolvedParams.sport)}`,
              locale,
            )}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "group_finder_header",
              cta: "create_group",
              sport: resolvedParams.sport,
            }}
            className="rt-btn-group inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            {t("header.createGroup")}
          </TrackedLink>
        </SportFinderHero>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <GroupFinder
              sportCode={resolvedParams.sport}
              locale={locale}
              fallbackImage={meta.coverImage}
              copy={copy}
              dayLabels={dayLabels}
              initialGroups={groupData.groups}
              total={groupData.count}
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
