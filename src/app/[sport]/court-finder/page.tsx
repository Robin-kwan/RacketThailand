import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourtFinder } from "@/components/court-finder";
import { LocationDirectoryLinks } from "@/components/location-directory-links";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { getSportDiscoveryCopy } from "@/lib/sport-discovery-copy";
import { fetchCourtsBySport } from "@/server/courtFinder";
import {
  localizeThailandLocation,
  resolveThailandLocationIds,
} from "@/server/thailand-location";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = {
  lang?: string;
  search?: string;
  province?: string;
  startTime?: string;
  endTime?: string;
};
type SearchParamsInput = Promise<SearchParams> | undefined;

function sanitizeQueryParam(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

function slugifyLocationName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveProvinceFilter(value: string, locale: "th" | "en") {
  const provinceId = Number(value);
  if (Number.isFinite(provinceId)) {
    const [localized, english] = await Promise.all([
      localizeThailandLocation({ province_id: provinceId }, locale),
      localizeThailandLocation({ province_id: provinceId }, "en"),
    ]);
    const label = localized.province ?? value;
    return {
      label,
      queryValue: slugifyLocationName(english.province ?? label) || value,
    };
  }

  const resolved = await resolveThailandLocationIds({ province: value });
  if (resolved.provinceId) {
    const label =
      locale === "en"
        ? (resolved.provinceNameEn ?? resolved.provinceNameTh ?? value)
        : (resolved.provinceNameTh ?? resolved.provinceNameEn ?? value);
    return {
      label,
      queryValue:
        slugifyLocationName(resolved.provinceNameEn ?? label) || value,
    };
  }

  return {
    label: value,
    queryValue: value,
  };
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
      title: "Court finder | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const provinceFilter = sanitizeQueryParam(resolvedSearch?.province);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const hasActiveFilters = Boolean(
    searchQuery || provinceFilter || startTimeFilter || endTimeFilter,
  );
  const canonicalPath = `/${resolvedParams.sport}/court-finder`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const discoveryCopy = getSportDiscoveryCopy(resolvedParams.sport, locale);
  const title =
    discoveryCopy?.courtFinderTitle ??
    `${meta.name[locale]} Court Finder | RacketThailand`;
  const description =
    discoveryCopy?.courtFinderDescription ??
    `Find ${meta.name[locale]} courts in Thailand with map locations and contact details.`;
  const finderPreviewImage = buildAbsoluteUrl(meta.coverImage);
  const finderPreviewAlt =
    locale === "th"
      ? `ค้นหาสนาม${meta.name[locale]}บน RacketThailand`
      : `Find ${meta.name[locale]} courts on RacketThailand`;

  const metaDescription = truncateMetaDescription(description);

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

  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const provinceFilter = sanitizeQueryParam(resolvedSearch?.province);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const hasActiveFilters = Boolean(
    searchQuery || provinceFilter || startTimeFilter || endTimeFilter,
  );
  const provinceInfo = provinceFilter
    ? await resolveProvinceFilter(provinceFilter, locale)
    : null;
  const courtData = await fetchCourtsBySport(
    resolvedParams.sport,
    {
      search: searchQuery || undefined,
      province: provinceFilter || undefined,
      startTime: startTimeFilter || undefined,
      endTime: endTimeFilter || undefined,
      limit: 12,
    },
    locale,
  );
  if (!courtData.sport) {
    notFound();
  }

  const copy = {
    title:
      getSportDiscoveryCopy(resolvedParams.sport, locale)?.courtFinderTitle.replace(
        " | RacketThailand",
        "",
      ) ?? t("courtFinder.title", { sport: meta.name[locale] }),
    subtitle:
      getSportDiscoveryCopy(resolvedParams.sport, locale)
        ?.courtFinderDescription ?? t("courtFinder.subtitle"),
    searchPlaceholder: t("courtFinder.searchPlaceholder"),
    provinceLabel: t("courtFinder.provinceLabel"),
    startTimeLabel: t("courtFinder.startTimeLabel"),
    endTimeLabel: t("courtFinder.endTimeLabel"),
    timeClearLabel: t("courtFinder.timeClearLabel"),
    allProvincesLabel: t("courtFinder.allProvinces"),
    resetFilters: t("courtFinder.reset"),
    emptyTitle: t("courtFinder.emptyTitle"),
    emptyDescription: t("courtFinder.emptyDescription"),
    backLink: t("courtFinder.backLink"),
    nearbyButton: t("courtFinder.nearbyButton"),
    nearbyFinding: t("courtFinder.nearbyFinding"),
    nearbyClear: t("courtFinder.nearbyClear"),
    nearbyUnsupported: t("courtFinder.nearbyUnsupported"),
    nearbyDenied: t("courtFinder.nearbyDenied"),
    nearbyActive: t("courtFinder.nearbyActive"),
    nearbyEmpty: t("courtFinder.nearbyEmpty"),
    distanceLabel: t("courtFinder.distanceLabel"),
    mapHeading: t("courtFinder.mapHeading"),
    openMaps: t("courtFinder.openMaps"),
    addCourtCta: t("courtSubmission.submit"),
    filtersLabel: t("courtFinder.filtersLabel"),
    moreFiltersTitle: t("courtFinder.moreFiltersTitle"),
    applyFiltersLabel: t("courtFinder.applyFiltersLabel"),
    closeFiltersLabel: t("courtFinder.closeFiltersLabel"),
    removeFilterLabel: t("courtFinder.removeFilterLabel"),
    loadMoreLabel: t("courtFinder.loadMore"),
    loadingMoreLabel: t("courtFinder.loadingMore"),
    noPhotoLabel: t("courtFinder.noPhoto"),
    priceLabel: t("courtFinder.price"),
    searchError: t("finderFeedback.searchError"),
    loadMoreError: t("finderFeedback.loadMoreError"),
    retryLabel: t("finderFeedback.retry"),
    loadingLabel: t("finderFeedback.loading"),
  };
  const canonicalUrl = buildCanonicalUrl(
    `/${resolvedParams.sport}/court-finder`,
    locale,
  );
  const structuredData =
    !hasActiveFilters && courtData.courts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": canonicalUrl,
          url: canonicalUrl,
          name: copy.title,
          description: copy.subtitle,
          inLanguage: locale === "th" ? "th-TH" : "en",
          mainEntity: {
            "@type": "ItemList",
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: courtData.count,
            itemListElement: courtData.courts.map((court, index) => {
              const photoUrl =
                court.court_photos?.find((photo) => photo.is_primary)
                  ?.image_url ??
                court.court_photos?.[0]?.image_url ??
                undefined;

              return {
                "@type": "ListItem",
                position: index + 1,
                url: buildCanonicalUrl(`/courts/${court.id}`, locale),
                item: {
                  "@type": "SportsActivityLocation",
                  name: court.name,
                  url: buildCanonicalUrl(`/courts/${court.id}`, locale),
                  address: [court.district, court.province]
                    .filter(Boolean)
                    .join(", "),
                  image: photoUrl ? buildAbsoluteUrl(photoUrl) : undefined,
                },
              };
            }),
          },
        }
      : null;

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
            href={buildLocalizedPath(
              `/courts/new?sport=${encodeURIComponent(resolvedParams.sport)}`,
              locale,
            )}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "court_finder_header",
              cta: "add_court",
              sport: resolvedParams.sport,
            }}
            className="rt-btn-court inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            {t("courtSubmission.submit")}
          </TrackedLink>
        </SportFinderHero>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <CourtFinder
              sportCode={resolvedParams.sport}
              locale={locale}
              copy={copy}
              initialCourts={courtData.courts}
              provinces={courtData.provinces}
              total={courtData.count}
              initialSearch={searchQuery}
              initialProvince={provinceInfo?.queryValue ?? provinceFilter}
              initialStartTime={startTimeFilter}
              initialEndTime={endTimeFilter}
            />
            <LocationDirectoryLinks sport={resolvedParams.sport} kind="courts" locale={locale} />
          </div>
        </section>
        {structuredData && (
          <script
            id={`court-finder-schema-${resolvedParams.sport}-${locale}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
            }}
          />
        )}
      </main>
    </div>
  );
}
