import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourtFinder } from "@/components/court-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
} from "@/lib/seo";
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
      localizeThailandLocation(
        { province_id: provinceId },
        locale,
      ),
      localizeThailandLocation(
        { province_id: provinceId },
        "en",
      ),
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
  const provinceInfo = provinceFilter
    ? await resolveProvinceFilter(provinceFilter, locale)
    : null;
  const provinceLabel = provinceInfo?.label ?? "";
  const hasFreeTextSearch = Boolean(searchQuery);
  const canonicalPath = buildFinderPath(
    `/${resolvedParams.sport}/court-finder`,
    hasFreeTextSearch ? {} : { province: provinceInfo?.queryValue },
  );
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title =
    locale === "th"
      ? `ค้นหาสนาม${meta.name[locale]} | RacketThailand`
      : `${meta.name[locale]} Court Finder | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหาสนาม${meta.name[locale]} พร้อมพิกัด แผนที่ และข้อมูลติดต่อจากทั่วประเทศไทย`
      : `Browse ${meta.name[locale]} courts in Thailand with map location, contacts, and live community updates.`;

  const filteredTitle = searchQuery
    ? locale === "th"
      ? `ผลการค้นหาสนาม${meta.name[locale]} "${searchQuery}" | RacketThailand`
      : `${meta.name[locale]} courts matching "${searchQuery}" | RacketThailand`
    : provinceLabel
      ? locale === "th"
        ? `สนาม${meta.name[locale]}ใน${provinceLabel} | RacketThailand`
        : `${meta.name[locale]} courts in ${provinceLabel} | RacketThailand`
      : title;
  const filteredDescription = searchQuery
    ? locale === "th"
      ? `ดูผลการค้นหาสนาม${meta.name[locale]}ที่เกี่ยวข้องกับ "${searchQuery}" พร้อมพิกัด แผนที่ และข้อมูลติดต่อ`
      : `Browse ${meta.name[locale]} court results matching "${searchQuery}" with map locations and contact details.`
    : provinceLabel
      ? locale === "th"
        ? `ค้นหาสนาม${meta.name[locale]}ใน${provinceLabel} พร้อมพิกัด แผนที่ และข้อมูลติดต่อ`
        : `Find ${meta.name[locale]} courts in ${provinceLabel} with map locations, contact details, and community context.`
      : description;
  const courtPreview = await fetchCourtsBySport(
    resolvedParams.sport,
    {
      search: searchQuery || undefined,
      province: provinceFilter || undefined,
      limit: 1,
      includeProvinces: false,
    },
    locale,
  );
  const hasListings = (courtPreview.count ?? 0) > 0;

  return {
    title: filteredTitle,
    description: filteredDescription,
    robots: hasFreeTextSearch || !hasListings
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
  const provinceInfo = provinceFilter
    ? await resolveProvinceFilter(provinceFilter, locale)
    : null;
  const courtData = await fetchCourtsBySport(resolvedParams.sport, {
    search: searchQuery || undefined,
    province: provinceFilter || undefined,
    limit: 12,
  }, locale);
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
    nearbyButton: t("courtFinder.nearbyButton"),
    nearbyFinding: t("courtFinder.nearbyFinding"),
    nearbyClear: t("courtFinder.nearbyClear"),
    nearbyUnsupported: t("courtFinder.nearbyUnsupported"),
    nearbyDenied: t("courtFinder.nearbyDenied"),
    nearbyActive: t("courtFinder.nearbyActive"),
    distanceLabel: t("courtFinder.distanceLabel"),
    mapHeading: t("courtFinder.mapHeading"),
    openMaps: t("courtFinder.openMaps"),
    addCourtCta: t("courtSubmission.submit"),
  };
  const canonicalPath = buildFinderPath(
    `/${resolvedParams.sport}/court-finder`,
    searchQuery ? {} : { province: provinceInfo?.queryValue },
  );
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);
  const structuredData =
    courtData.courts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": canonicalUrl,
          url: canonicalUrl,
          name: copy.title,
          description: copy.subtitle,
          mainEntity: {
            "@type": "ItemList",
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
              {t("courtFinder.backToSport")}
            </Link>
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
              className="rounded-full bg-[var(--rt-primary)] px-4 py-2 font-semibold text-[var(--rt-primary-text)] hover:bg-[var(--rt-primary-soft)]"
            >
              {t("courtSubmission.submit")}
            </TrackedLink>
          </div>
        </section>
        <CourtFinder
          sportCode={resolvedParams.sport}
          locale={locale}
          copy={copy}
          initialCourts={courtData.courts}
          provinces={courtData.provinces}
          total={courtData.count}
          initialSearch={searchQuery}
          initialProvince={provinceInfo?.queryValue ?? provinceFilter}
        />
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
        )}
      </main>
    </div>
  );
}
