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
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

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
  const canonicalPath = `/${resolvedParams.sport}/group-finder`;
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

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const groupData = await fetchGroupsBySport(resolvedParams.sport, {
    limit: 12,
  });
  if (!groupData.sport) {
    notFound();
  }

  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayLabels = dayKeys.reduce<Record<string, string>>(
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
    anyTimeLabel: t("groupFinder.anyTimeLabel"),
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
          <span className="rounded-full border border-[rgb(var(--rt-primary-rgb)/0.3)] bg-[rgb(var(--rt-primary-rgb)/0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--rt-primary-rgb))]">
            {t("header.groupFinder")}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
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
              href={buildLocalizedPath("/groups/create", locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "group_finder_header",
                cta: "create_group",
                sport: resolvedParams.sport,
              }}
              className="rounded-full bg-[var(--rt-primary)] px-4 py-2 font-semibold uppercase tracking-wide text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
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
        />
      </main>
    </div>
  );
}
