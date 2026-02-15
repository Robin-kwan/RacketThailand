import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourtFinder } from "@/components/court-finder";
import { getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { fetchCourtsBySport } from "@/server/courtFinder";

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
      title: "Court finder | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const canonicalPath = `/${resolvedParams.sport}/court-finder`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title =
    locale === "th"
      ? `ค้นหาสนาม ${meta.name[locale]} | RacketThailand`
      : `${meta.name[locale]} Court Finder | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหาสนาม ${meta.name[locale]} พร้อมตำแหน่ง แผนที่ และช่องทางติดต่อในประเทศไทย`
      : `Browse ${meta.name[locale]} courts in Thailand with map location and contact details.`;

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

export default async function CourtFinderPage({
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


  const courtData = await fetchCourtsBySport(resolvedParams.sport, {
    limit: 12,
  });
  if (!courtData.sport) {
    notFound();
  }

  const copy = {
    title: t("courtFinder.title", { sport: meta.name[locale] }),
    subtitle: t("courtFinder.subtitle"),
    searchPlaceholder: t("courtFinder.searchPlaceholder"),
    provinceLabel: t("courtFinder.provinceLabel"),
    resetFilters: t("courtFinder.reset"),
    emptyTitle: t("courtFinder.emptyTitle"),
    emptyDescription: t("courtFinder.emptyDescription"),
    backLink: t("courtFinder.backLink"),
    lastUpdated: t("courtFinder.lastUpdated"),
    nearbyButton: t("courtFinder.nearbyButton"),
    nearbyFinding: t("courtFinder.nearbyFinding"),
    nearbyClear: t("courtFinder.nearbyClear"),
    nearbyUnsupported: t("courtFinder.nearbyUnsupported"),
    nearbyDenied: t("courtFinder.nearbyDenied"),
    nearbyActive: t("courtFinder.nearbyActive"),
    distanceLabel: t("courtFinder.distanceLabel"),
    mapHeading: t("courtFinder.mapHeading"),
    openMaps: t("courtFinder.openMaps"),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 backdrop-blur">
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
            <Link
              href={buildLocalizedPath(`/${resolvedParams.sport}`, locale)}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
            >
              {t("courtFinder.backToSport")}
            </Link>
          </div>
        </section>
        <CourtFinder
          sportCode={resolvedParams.sport}
          locale={locale}
          copy={copy}
          initialCourts={courtData.courts}
          provinces={courtData.provinces}
          total={courtData.count}
        />
      </main>
    </div>
  );
}
