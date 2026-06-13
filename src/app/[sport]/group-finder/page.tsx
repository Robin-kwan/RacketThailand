import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GroupFinder } from "@/components/group-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { fetchGroupsBySport } from "@/server/groupFinder";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = {
  lang?: string;
  search?: string;
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
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasFreeTextSearch = Boolean(searchQuery);
  const stableQuery = hasFreeTextSearch
    ? {}
    : {
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
  const title =
    locale === "th"
      ? `ค้นหากลุ่ม${meta.name[locale]} | RacketThailand`
      : `${meta.name[locale]} Group Finder | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหากลุ่ม${meta.name[locale]} ที่เปิดรับสมาชิก พร้อมวันเวลาเล่นและข้อมูลติดต่อจากทั่วประเทศไทย`
      : `Find active ${meta.name[locale]} groups in Thailand with schedules, contacts, and nearby map context.`;

  const validDayFilter = isDayKey(dayFilter) ? dayFilter : "";
  const filterParts = [
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
      ? `ดูผลการค้นหากลุ่ม${meta.name[locale]}ที่เกี่ยวข้องกับ "${searchQuery}" พร้อมวันเวลาเล่นและข้อมูลติดต่อ`
      : `Browse ${meta.name[locale]} group results matching "${searchQuery}" with schedules and contact details.`
    : filterSummary
      ? locale === "th"
        ? `ค้นหากลุ่ม${meta.name[locale]}ตามตัวกรอง ${filterSummary} พร้อมวันเวลาเล่นและข้อมูลติดต่อ`
        : `Find ${meta.name[locale]} groups filtered by ${filterSummary}, with schedules and contact details.`
      : description;

  return {
    title: filteredTitle,
    description: filteredDescription,
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
      description: filteredDescription,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: filteredTitle,
      description: filteredDescription,
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
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const groupData = await fetchGroupsBySport(resolvedParams.sport, {
    search: searchQuery || undefined,
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_0%_0%,rgb(var(--rt-primary-rgb)/0.16),transparent_42%),radial-gradient(circle_at_92%_18%,rgb(var(--foreground-rgb)/0.08),transparent_44%)]"
        />
        <section className="rounded-[34px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white/95 p-8 shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.08)] backdrop-blur">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
            <Link
              href={buildLocalizedPath(`/${resolvedParams.sport}`, locale)}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
            >
              {t("groupFinder.backToSport")}
            </Link>
            <TrackedLink
              href={buildLocalizedPath(`/${resolvedParams.sport}/casual-plays`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "group_finder_header",
                cta: "open_casual_plays",
                sport: resolvedParams.sport,
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
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
              className="rounded-full bg-[var(--rt-primary)] px-4 py-2 font-semibold text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
            >
              {t("header.createGroup")}
            </TrackedLink>
          </div>
        </section>
        <GroupFinder
          sportCode={resolvedParams.sport}
          locale={locale}
          fallbackImage={meta.coverImage}
          copy={copy}
          dayLabels={dayLabels}
          initialGroups={groupData.groups}
          total={groupData.count}
          initialSearch={searchQuery}
          initialDay={isDayKey(dayFilter) ? dayFilter : ""}
          initialStartTime={startTimeFilter}
          initialEndTime={endTimeFilter}
          initialPlayFormat={playFormatFilter}
          initialAllowWalkIn={walkInFilter}
        />
      </main>
    </div>
  );
}
