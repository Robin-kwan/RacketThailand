import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

function getThaiCasualPlayIntent(sportCode: string, sportName: string) {
  const playVerbSports = new Set(["padel", "pickleball"]);
  const verb = playVerbSports.has(sportCode) ? "เล่น" : "ตี";
  return `หาเพื่อน${verb}${sportName}`;
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
  const thaiIntent = getThaiCasualPlayIntent(
    resolvedParams.sport,
    meta.name.th,
  );
  const title =
    locale === "th"
      ? `${thaiIntent} | RacketThailand`
      : `${meta.name[locale]} Casual Plays | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหาโพสต์${thaiIntent} พร้อมวัน เวลา สนาม และข้อมูลติดต่อ`
      : `Find one-off ${meta.name[locale]} sessions with date, court, and organizer contact details.`;
  const playData = await fetchCasualPlaysBySport(
    resolvedParams.sport,
    { limit: 1 },
    locale,
  );
  const hasActivePlays = (playData.count ?? 0) > 0;

  return {
    title,
    description,
    robots: hasActivePlays
      ? undefined
      : {
          index: false,
          follow: true,
        },
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
  }, locale);
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
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-screen-xl px-6 py-12 md:px-10 md:py-14">
            <div className="max-w-2xl border-l-2 border-[var(--rt-primary)] pl-5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.subtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <TrackedLink
                  href={buildLocalizedPath(`/${resolvedParams.sport}/group-finder`, locale)}
                  eventName="sport_cta_click"
                  eventPayload={{
                    surface: "casual_play_header",
                    cta: "open_group_finder",
                    sport: resolvedParams.sport,
                  }}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-500"
                >
                  {copy.groupFinderCta}
                </TrackedLink>
                <TrackedLink
                  href={buildLocalizedPath(
                    `/casual-plays/create?sport=${encodeURIComponent(resolvedParams.sport)}`,
                    locale,
                  )}
                  eventName="sport_cta_click"
                  eventPayload={{
                    surface: "casual_play_header",
                    cta: "create_casual_play",
                    sport: resolvedParams.sport,
                  }}
                  className="rt-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
                >
                  {copy.createCta}
                </TrackedLink>
              </div>
            </div>
          </div>
        </section>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <CasualPlayFinder
              sportCode={resolvedParams.sport}
              locale={locale}
              copy={copy}
              initialPlays={playData.plays}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
