import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CasualPlayFinder } from "@/components/casual-play-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { fetchCasualPlaysBySport } from "@/server/casualPlays";

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
      title: "Casual plays | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = `/${resolvedParams.sport}/casual-plays`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title =
    locale === "th"
      ? `หาเพื่อนตี${meta.name[locale]} | RacketThailand`
      : `${meta.name[locale]} Casual Plays | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหาโพสต์หาเพื่อนตี${meta.name[locale]} พร้อมวัน เวลา สนาม และข้อมูลติดต่อ`
      : `Find one-off ${meta.name[locale]} sessions with date, court, and organizer contact details.`;

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

export default async function CasualPlayFinderPage({
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

  const playData = await fetchCasualPlaysBySport(resolvedParams.sport, {
    limit: 12,
  });
  if (!playData.sport) {
    notFound();
  }

  const copy = {
    title: t("casualPlays.title", { sport: meta.name[locale] }),
    subtitle: t("casualPlays.subtitle"),
    searchPlaceholder: t("casualPlays.searchPlaceholder"),
    reset: t("casualPlays.reset"),
    emptyTitle: t("casualPlays.emptyTitle"),
    emptyDescription: t("casualPlays.emptyDescription"),
    dateLabel: t("casualPlays.dateLabel"),
    nearbyButton: t("casualPlays.nearbyButton"),
    nearbyFinding: t("casualPlays.nearbyFinding"),
    nearbyClear: t("casualPlays.nearbyClear"),
    nearbyUnsupported: t("casualPlays.nearbyUnsupported"),
    nearbyDenied: t("casualPlays.nearbyDenied"),
    nearbyActive: t("casualPlays.nearbyActive"),
    distanceLabel: t("casualPlays.distanceLabel"),
    mapHeading: t("casualPlays.mapHeading"),
    nearbyListTitle: t("casualPlays.nearbyListTitle"),
    openMaps: t("casualPlays.openMaps"),
    createCta: t("header.createCasualPlay"),
    groupFinderCta: t("sport.groupFinderCta"),
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
            {t("header.casualPlayFinder")}
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
              {t("casualPlays.backToSport")}
            </Link>
            <TrackedLink
              href={buildLocalizedPath(`/${resolvedParams.sport}/group-finder`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "casual_play_header",
                cta: "open_group_finder",
                sport: resolvedParams.sport,
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
            >
              {copy.groupFinderCta}
            </TrackedLink>
            <TrackedLink
              href={buildLocalizedPath("/casual-plays/create", locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "casual_play_header",
                cta: "create_casual_play",
                sport: resolvedParams.sport,
              }}
              className="rounded-full bg-[var(--rt-primary)] px-4 py-2 font-semibold uppercase tracking-wide text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
            >
              {copy.createCta}
            </TrackedLink>
          </div>
        </section>
        <CasualPlayFinder
          sportCode={resolvedParams.sport}
          locale={locale}
          copy={copy}
          initialPlays={playData.plays}
        />
      </main>
    </div>
  );
}
