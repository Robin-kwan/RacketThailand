import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { BaseScheduleList } from "@/components/base-schedule-list";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCourtDetail } from "@/server/courtFinder";
import { CourtMap } from "@/components/court-map";
import { ensureAllDays } from "@/lib/opening-hours";
import { ViewTracker } from "@/components/view-tracker";
import type { GroupCardSession } from "@/components/group-card";
import { CourtGroupRow } from "@/components/court-group-row";
import { ContactActionValue } from "@/components/contact-action-value";
import { ShareButton } from "@/components/share-button";
import { LineQrLightboxImage } from "@/components/line-qr-lightbox-image";
import type { Locale } from "@/lib/i18n";
import {
  Building2,
  CalendarDays,
  Clock3,
  Images,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";

function getGroupCover(group: {
  sports?: { code: string } | null;
  group_photos?:
    { image_url: string | null; is_primary: boolean | null }[] | null;
}) {
  const primary =
    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
    group.group_photos?.[0]?.image_url;
  if (primary) {
    return primary;
  }
  const fallbackCode = group.sports?.code ?? "";
  return SPORT_META[fallbackCode]?.coverImage ?? "/sports/badminton.png";
}

function getCourtFallbackImage(sportCode?: string | null) {
  return SPORT_META[sportCode ?? ""]?.coverImage ?? "/sports/badminton.png";
}

function formatUpcomingEventDateParts(value: string, locale: Locale) {
  const date = new Date(value);
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  const day = new Intl.DateTimeFormat(localeCode, {
    timeZone: "Asia/Bangkok",
    day: "numeric",
  }).format(date);
  return {
    weekday: new Intl.DateTimeFormat(localeCode, {
      timeZone: "Asia/Bangkok",
      weekday: "short",
    }).format(date),
    day,
    month: new Intl.DateTimeFormat(localeCode, {
      timeZone: "Asia/Bangkok",
      month: "short",
    }).format(date),
  };
}

function formatUpcomingEventTime(
  startsAt: string,
  endsAt: string | null,
  locale: Locale,
) {
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      timeZone: "Asia/Bangkok",
      hour: "numeric",
      minute: "2-digit",
    },
  );
  const start = formatter.format(new Date(startsAt));
  const end = endsAt ? formatter.format(new Date(endsAt)) : null;
  return end ? `${start} - ${end}` : start;
}

type CourtDetail = NonNullable<Awaited<ReturnType<typeof fetchCourtDetail>>>;
type CourtGroupEntry = CourtDetail["groups"][number];

function getSportDisplayName(
  sport:
    | {
        code?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  locale: Locale,
) {
  const code = sport?.code ?? "";
  return (
    SPORT_META[code]?.name?.[locale] ??
    sport?.name ??
    (locale === "th" ? "กีฬาอื่น" : "Other sport")
  );
}

function buildCourtGroupSections(
  groups: CourtGroupEntry[],
  locale: Locale,
  prioritySportCode?: string | null,
) {
  const sections = new Map<
    string,
    {
      code: string;
      label: string;
      groups: CourtGroupEntry[];
    }
  >();

  groups.forEach((group) => {
    const sport = group.groups?.sports;
    const code = sport?.code ?? "unknown";
    const existing = sections.get(code);
    if (existing) {
      existing.groups.push(group);
      return;
    }
    sections.set(code, {
      code,
      label: getSportDisplayName(sport, locale),
      groups: [group],
    });
  });

  return Array.from(sections.values()).sort((left, right) => {
    if (prioritySportCode) {
      const leftIsPriority = left.code === prioritySportCode;
      const rightIsPriority = right.code === prioritySportCode;
      if (leftIsPriority !== rightIsPriority) {
        return leftIsPriority ? -1 : 1;
      }
    }
    return left.label.localeCompare(right.label, locale === "th" ? "th" : "en");
  });
}

const DAY_LABELS: Record<string, { en: string; th: string }> = {
  sunday: { en: "Sunday", th: "วันอาทิตย์" },
  monday: { en: "Monday", th: "วันจันทร์" },
  tuesday: { en: "Tuesday", th: "วันอังคาร" },
  wednesday: { en: "Wednesday", th: "วันพุธ" },
  thursday: { en: "Thursday", th: "วันพฤหัสบดี" },
  friday: { en: "Friday", th: "วันศุกร์" },
  saturday: { en: "Saturday", th: "วันเสาร์" },
};

const SCHEMA_DAY_MAP: Record<string, string> = {
  monday: "https://schema.org/Monday",
  tuesday: "https://schema.org/Tuesday",
  wednesday: "https://schema.org/Wednesday",
  thursday: "https://schema.org/Thursday",
  friday: "https://schema.org/Friday",
  saturday: "https://schema.org/Saturday",
  sunday: "https://schema.org/Sunday",
};

function getDayLabel(day: string, locale: string) {
  const lang = locale === "th" ? "th" : "en";
  return DAY_LABELS[day]?.[lang] ?? day;
}

function formatTimeValue(value: string, locale: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatter.format(date);
}

function isClockValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function formatRangeDisplay(
  open: string,
  close: string | null,
  locale: string,
) {
  if (open === "Open" && !close) {
    return locale === "th" ? "เปิดตลอดเวลา" : "Open 24 hours";
  }
  if (!close) {
    return isClockValue(open) ? formatTimeValue(open, locale) : open;
  }
  const formattedOpen = isClockValue(open)
    ? formatTimeValue(open, locale)
    : open;
  const formattedClose = isClockValue(close)
    ? formatTimeValue(close, locale)
    : close;
  return `${formattedOpen} – ${formattedClose}`;
}

function toSchemaOpenTime(value: string) {
  if (!value || value === "Open") {
    return "00:00";
  }
  return value;
}

function toSchemaCloseTime(value: string | null) {
  if (!value || value === "Open") {
    return "00:00";
  }
  return value;
}

type Params = {
  courtId: string;
};

type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string; sport?: string };
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
  const detail = await fetchCourtDetail(resolvedParams.courtId, locale);
  if (!detail?.court || detail.court.is_active === false) {
    return {
      title:
        locale === "th"
          ? "ไม่พบข้อมูลสนาม | RacketThailand"
          : "Court not found | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const court = detail.court;
  const requestedSportCode = resolvedSearch?.sport?.trim() || null;
  const activeSport =
    detail.sports.find((sport) => sport.code === requestedSportCode) ??
    detail.sport;
  const activeSportCode = activeSport?.code ?? detail.sport?.code ?? null;
  const sportMeta = activeSportCode ? SPORT_META[activeSportCode] : undefined;
  const sportName =
    sportMeta?.name?.[locale] ??
    activeSport?.name ??
    (locale === "th" ? "สนามกีฬาแร็กเกต" : "Racket sport");
  const locationParts = [court.district, court.province]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  const descriptionParts = [
    court.description,
    court.address,
    locationParts,
    court.price_note
      ? `${locale === "th" ? "ราคา" : "Pricing"}: ${court.price_note}`
      : null,
    court.phone ? `${locale === "th" ? "โทร" : "Phone"}: ${court.phone}` : null,
  ].filter(Boolean);
  const rawDescription =
    descriptionParts.join(" · ") ||
    (locale === "th"
      ? `ดูรายละเอียด${sportName}บน RacketThailand`
      : `${sportName} venue listed on RacketThailand.`);
  const description = truncateMetaDescription(rawDescription);
  const canonicalPath = `/courts/${resolvedParams.courtId}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternateLanguages = buildLocaleAlternates(canonicalPath);
  const heroImage =
    detail.photos?.find((photo) => photo.is_primary)?.image_url ??
    detail.photos?.[0]?.image_url ??
    sportMeta?.coverImage ??
    undefined;
  const metadataTitle = `RacketThailand • ${court.name ?? sportName}`;

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical,
      languages: alternateLanguages,
    },
    openGraph: {
      title: metadataTitle,
      description,
      url: canonical,
      type: "website",
      images: heroImage
        ? [
            {
              url: heroImage,
              alt:
                locale === "th"
                  ? `รูปสนาม ${court.name ?? sportName}`
                  : `${court.name ?? sportName} court photo`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function CourtPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(resolvedParams.courtId)) {
    notFound();
  }
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const dayLabels = Object.fromEntries(
    Object.entries(DAY_LABELS).map(([key, labels]) => [
      key,
      locale === "th" ? labels.th : labels.en,
    ]),
  );
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = user
    ? await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single()
    : { data: null };

  const detail = await fetchCourtDetail(resolvedParams.courtId, locale);
  if (!detail || !detail.court) {
    notFound();
  }

  const isOwnerViewer =
    user?.id && detail.court.created_by
      ? user.id === detail.court.created_by
      : false;
  const isAdminViewer = viewerProfile?.status === "admin";

  if (detail.court.is_active === false && !isOwnerViewer && !isAdminViewer) {
    notFound();
  }

  const requestedSportCode = resolvedSearch?.sport?.trim() || null;
  const activeSport =
    detail.sports.find((sport) => sport.code === requestedSportCode) ??
    detail.sport;
  const activeSportCode = activeSport?.code ?? detail.sport?.code ?? null;
  const groupSections = buildCourtGroupSections(
    detail.groups,
    locale,
    activeSportCode,
  );
  const upcomingEvents = detail.upcomingEvents.filter(
    (event) =>
      !activeSportCode || event.groups?.sports?.code === activeSportCode,
  );

  const gallery = detail.photos.length
    ? detail.photos
    : [
        {
          id: "placeholder",
          image_url: getCourtFallbackImage(activeSportCode),
          is_primary: true,
          allowFullscreen: false,
        },
      ];

  const openingHourEntries = ensureAllDays(detail.court.opening_hours);
  const hasAnyHours = openingHourEntries.some(
    (entry) => entry.ranges.length > 0,
  );
  const numericLatitude =
    detail.court.latitude !== undefined && detail.court.latitude !== null
      ? Number(detail.court.latitude)
      : null;
  const numericLongitude =
    detail.court.longitude !== undefined && detail.court.longitude !== null
      ? Number(detail.court.longitude)
      : null;
  const hasMapCoordinates =
    typeof numericLatitude === "number" &&
    !Number.isNaN(numericLatitude) &&
    typeof numericLongitude === "number" &&
    !Number.isNaN(numericLongitude);
  const todayKey = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
  const openingHourRows = openingHourEntries.map((entry, entryIndex) => {
    const normalizedDay = entry.day.toLowerCase().trim();
    const isToday =
      normalizedDay.startsWith(todayKey.slice(0, 3)) ||
      normalizedDay.includes(todayKey);
    const dayLabel = getDayLabel(normalizedDay, locale);
    const display =
      entry.ranges?.length > 0
        ? entry.ranges
            .map((range) => formatRangeDisplay(range.open, range.close, locale))
            .join(", ")
        : locale === "th"
          ? "ปิด"
          : "Closed";
    return {
      id: `${entry.day}-${entryIndex}`,
      label: dayLabel,
      value: display,
      highlighted: isToday,
    };
  });

  const copy = {
    contact: t("courtPage.contact"),
    description: t("courtPage.description"),
    address: t("courtPage.address"),
    price: t("courtPage.price"),
    phone: t("courtPage.phone"),
    line: t("courtPage.line"),
    lineQr: t("courtPage.lineQr"),
    website: t("courtPage.website"),
    hours: t("courtPage.hours"),
    availableSports: t("courtPage.availableSports"),
    back: t("courtPage.back"),
    groupsTitle: t("courtPage.groupsTitle"),
    groupsEmpty: t("courtPage.groupsEmpty"),
    upcomingSessionsTitle: t("courtPage.upcomingSessionsTitle"),
    verified: t("courtPage.verified"),
    verifiedTooltip: t("courtPage.verifiedTooltip"),
    statusPending: t("courtPage.statusPending"),
    statusRejected: t("courtPage.statusRejected"),
    noteLabel: t("courtPage.note"),
    copyAction: t("contactActions.copy"),
    copiedAction: t("contactActions.copied"),
    callAction: t("contactActions.call"),
    shareAction: t("contactActions.share"),
    linkCopiedAction: t("contactActions.linkCopied"),
    edit: t("courtPage.edit"),
    createGroup: t("header.createGroup"),
    groupScheduleAny: t("groups.detail.scheduleAny"),
    walkInsWelcome: t("groups.detail.walkInsWelcome"),
    walkInsClosed: t("groups.detail.walkInsClosed"),
    backToGroupFinder: t("courtPage.backToGroupFinder"),
    mapDirections: t("courtPage.mapDirections"),
    mapDescription: t("courtPage.mapDescription"),
    openGoogleMaps: t("courtPage.openGoogleMaps"),
    courtPhotos: t("courtPage.courtPhotos"),
    courtDetails: t("courtPage.courtDetails"),
    directions: t("courtPage.directions"),
  };
  const fallbackCourtName =
    locale === "th" ? "ยังไม่ระบุชื่อสนาม" : "Unnamed court";
  const fallbackGroupName = locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackGroupPhotoAlt = locale === "th" ? "รูปกลุ่ม" : "Group photo";
  const availableSports = detail.sports.length
    ? detail.sports
    : activeSport
      ? [activeSport]
      : [];

  const canEdit = Boolean(isOwnerViewer || isAdminViewer);
  const canonicalPath = `/courts/${detail.court.id}`;
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);
  const shareTitle = detail.court.name ?? fallbackCourtName;
  const shareText =
    [detail.court.address, detail.court.district, detail.court.province]
      .filter(Boolean)
      .join(" · ") ||
    (locale === "th"
      ? `ดูรายละเอียดสนาม ${shareTitle} บน RacketThailand`
      : `View ${shareTitle} on RacketThailand`);
  const primaryImage = gallery[0]?.image_url ?? null;
  const structuredDataImage = primaryImage
    ? primaryImage.startsWith("http")
      ? primaryImage
      : buildAbsoluteUrl(primaryImage)
    : undefined;
  const openingHoursSpecification = openingHourEntries.flatMap((entry) =>
    entry.ranges.map((range) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY_MAP[entry.day] ?? "https://schema.org/DayOfWeek",
      opens: toSchemaOpenTime(range.open),
      closes: toSchemaCloseTime(range.close),
    })),
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": canonicalUrl,
    name: detail.court.name ?? (locale === "th" ? "สนาม" : "Court"),
    description: detail.court.description ?? undefined,
    url: canonicalUrl,
    image: structuredDataImage,
    telephone: detail.court.phone ?? undefined,
    priceRange: detail.court.price_note ?? undefined,
    sameAs: detail.court.website_url ? [detail.court.website_url] : undefined,
    address:
      detail.court.address || detail.court.district || detail.court.province
        ? {
            "@type": "PostalAddress",
            streetAddress: detail.court.address ?? undefined,
            addressLocality: detail.court.district ?? undefined,
            addressRegion: detail.court.province ?? undefined,
          }
        : undefined,
    geo: hasMapCoordinates
      ? {
          "@type": "GeoCoordinates",
          latitude: numericLatitude,
          longitude: numericLongitude,
        }
      : undefined,
    openingHoursSpecification: openingHoursSpecification.length
      ? openingHoursSpecification
      : undefined,
  };
  const mapsHref = hasMapCoordinates
    ? detail.court.google_place_id
      ? `https://www.google.com/maps/search/?${new URLSearchParams({
          api: "1",
          query: `${numericLatitude},${numericLongitude}`,
          query_place_id: detail.court.google_place_id,
        }).toString()}`
      : `https://www.google.com/maps/search/?${new URLSearchParams({
          api: "1",
          query: `${detail.court.name ?? shareTitle} ${numericLatitude},${numericLongitude}`,
        }).toString()}`
    : null;

  return (
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <ViewTracker event="court_view" payload={{ courtId: detail.court.id }} />
      <HeaderSportScope sportSlug={activeSportCode ?? undefined} />
      <HeaderSubLabel value={getSportDisplayName(activeSport, locale)} />
      <main className="pb-16 md:pb-20">
        <section className="relative overflow-hidden bg-[#071b14] text-white">
          <div className="absolute inset-0">
            <CourtGallery
              gallery={gallery}
              courtName={detail.court.name}
              variant="hero"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[#04130e]/40" />
          <div className="pointer-events-none absolute inset-0 bg-[#04130e]/20" />
          <div className="pointer-events-none relative mx-auto flex min-h-[240px] max-w-screen-xl items-end px-6 py-5 md:min-h-[300px] md:px-10 md:py-8">
            <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {detail.court.name ?? fallbackCourtName}
                </h1>
                <p className="mt-2 text-sm font-medium text-white/80 md:text-base">
                  {[detail.court.district, detail.court.province]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {availableSports.length > 0 ? (
                  <div className="pointer-events-auto mt-4 flex flex-wrap gap-2">
                    {availableSports.map((sport) => {
                      const sportCode = sport.code ?? "";
                      const isActive = sportCode === activeSportCode;
                      const sportLabel = getSportDisplayName(sport, locale);
                      const chipClassName = `rounded-full border px-3 py-1 text-xs font-semibold text-white transition ${
                        isActive
                          ? "border-white/80 bg-white/25"
                          : "border-white/35 bg-black/20 hover:border-white/60 hover:bg-black/30"
                      }`;

                      if (availableSports.length === 1) {
                        return (
                          <span
                            key={sport.id ?? sportCode}
                            className={chipClassName}
                          >
                            {sportLabel}
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={sport.id ?? sportCode}
                          href={buildLocalizedPath(
                            `/courts/${detail.court.id}${sportCode ? `?sport=${encodeURIComponent(sportCode)}` : ""}`,
                            locale,
                          )}
                          aria-current={isActive ? "page" : undefined}
                          className={chipClassName}
                        >
                          {sportLabel}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="pointer-events-auto flex shrink-0 flex-wrap items-center gap-3">
                {mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rt-btn-court inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                  >
                    <Navigation className="size-4" aria-hidden />
                    {copy.directions}
                  </a>
                ) : null}
                <ShareButton
                  title={shareTitle}
                  text={shareText}
                  url={canonicalUrl}
                  label={copy.shareAction}
                  copiedLabel={copy.linkCopiedAction}
                  className="!border-white/40 !bg-black/20 !text-white hover:!border-white/70 hover:!bg-black/30"
                />
                {canEdit ? (
                  <Link
                    href={buildLocalizedPath(
                      `/courts/${resolvedParams.courtId}/edit`,
                      locale,
                    )}
                    className="rounded-full border border-white/40 bg-black/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/70"
                  >
                    {copy.edit}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-screen-xl px-6 pt-8 md:px-10 md:pt-9">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-4">
              {detail.photos.length > 0 ? (
                <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Images className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.courtPhotos}
                    </h2>
                    <span className="text-sm text-slate-500">
                      {detail.photos.length}
                    </span>
                  </div>
                  <CourtGallery
                    gallery={detail.photos}
                    courtName={detail.court.name}
                    variant="court-grid"
                  />
                </section>
              ) : null}

              {detail.court.description ? (
                <section
                  className={
                    detail.photos.length > 0
                      ? "border-t border-slate-200 pt-8"
                      : ""
                  }
                >
                  <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
                    {detail.court.description}
                  </p>
                </section>
              ) : null}

              {hasAnyHours ? (
                <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      <Clock3 className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.hours}
                    </h2>
                  </div>
                  <BaseScheduleList
                    entries={openingHourRows}
                    variant="responsive"
                  />
                </section>
              ) : null}

              {upcomingEvents.length > 0 ? (
                <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                      <CalendarDays className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.upcomingSessionsTitle}
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {upcomingEvents.map((event) => {
                      const eventGroup = event.groups;
                      if (!eventGroup) return null;
                      const eventDate = formatUpcomingEventDateParts(
                        event.starts_at,
                        locale,
                      );
                      return (
                        <Link
                          key={event.id}
                          href={buildLocalizedPath(
                            `/groups/${eventGroup.id}${eventGroup.sports?.code ? `?sport=${encodeURIComponent(eventGroup.sports.code)}` : ""}`,
                            locale,
                          )}
                          className="flex items-center gap-4 py-4"
                        >
                          <div className="w-16 shrink-0 text-center">
                            <p className="text-xs font-semibold text-violet-700">
                              {eventDate.weekday}
                            </p>
                            <p className="text-2xl font-semibold text-slate-950">
                              {eventDate.day}
                            </p>
                            <p className="text-xs text-slate-500">
                              {eventDate.month}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-950">
                              {eventGroup.name ?? fallbackGroupName}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatUpcomingEventTime(
                                event.starts_at,
                                event.ends_at,
                                locale,
                              )}
                            </p>
                            {event.notes ? (
                              <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">
                                {event.notes}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                      <Users className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.groupsTitle}
                    </h2>
                  </div>
                  <Link
                    href={buildLocalizedPath(
                      `/groups/create?${new URLSearchParams({ ...(activeSportCode ? { sport: activeSportCode } : {}), court: detail.court.id }).toString()}`,
                      locale,
                    )}
                    className="rt-btn-group inline-flex items-center justify-center px-4 py-2 text-sm"
                  >
                    {copy.createGroup}
                  </Link>
                </div>
                {detail.groups.length === 0 ? (
                  <p className="text-sm text-slate-600">{copy.groupsEmpty}</p>
                ) : (
                  <div className="space-y-6">
                    {groupSections.map((section) => (
                      <section key={section.code}>
                        {groupSections.length > 1 ? (
                          <h3 className="pb-2 text-sm font-semibold text-slate-500">
                            {section.label}
                          </h3>
                        ) : null}
                        <div className="divide-y divide-slate-200 border-y border-slate-200">
                          {section.groups.map((group) => {
                            const groupSportCode =
                              group.groups?.sports?.code ?? null;
                            const sessionsForCourt: GroupCardSession[] = (
                              Array.isArray(group.groups?.group_sessions)
                                ? group.groups.group_sessions
                                : []
                            )
                              .filter(
                                (session) =>
                                  session.court_id === detail.court.id,
                              )
                              .map((session) => ({
                                day: session.day,
                                start_time: session.start_time,
                                end_time: session.end_time,
                                courts: null,
                              }));
                            return (
                              <CourtGroupRow
                                key={group.id}
                                href={
                                  group.groups?.id
                                    ? buildLocalizedPath(
                                        `/groups/${group.groups.id}${groupSportCode ? `?sport=${encodeURIComponent(groupSportCode)}` : ""}`,
                                        locale,
                                      )
                                    : null
                                }
                                name={group.groups?.name ?? fallbackGroupName}
                                imageUrl={
                                  group.groups
                                    ? getGroupCover(group.groups)
                                    : "/sports/badminton.png"
                                }
                                imageAlt={
                                  group.groups?.name ?? fallbackGroupPhotoAlt
                                }
                                sessions={sessionsForCourt}
                                dayLabels={dayLabels}
                                scheduleAnytime={copy.groupScheduleAny}
                                locale={locale as Locale}
                                description={group.groups?.description ?? null}
                                playFormat={group.groups?.play_format ?? null}
                                allowWalkIn={group.groups?.allow_walk_in ?? null}
                                walkInsWelcome={copy.walkInsWelcome}
                                walkInsClosed={copy.walkInsClosed}
                                verifiedLabel={
                                  group.verification_status === "verified"
                                    ? copy.verified
                                    : null
                                }
                                verifiedTooltip={
                                  group.verification_status === "verified"
                                    ? copy.verifiedTooltip
                                    : null
                                }
                              />
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {copy.courtDetails}
                  </h2>
                </div>
                <div className="space-y-5 pt-5 text-sm text-slate-600">
                  {detail.court.address ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.address}
                      </p>
                      <p className="mt-1 leading-6 text-slate-700">
                        {detail.court.address}
                      </p>
                    </div>
                  ) : null}
                  {availableSports.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.availableSports}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {availableSports
                          .map((sport) => getSportDisplayName(sport, locale))
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}
                  {detail.court.price_note ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.price}
                      </p>
                      <div
                        className="prose prose-sm mt-1 max-w-none whitespace-pre-line text-slate-700"
                        dangerouslySetInnerHTML={{
                          __html: detail.court.price_note,
                        }}
                      />
                    </div>
                  ) : null}
                  {detail.court.phone ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.phone}
                      </p>
                      <ContactActionValue
                        mode="phone"
                        value={detail.court.phone}
                        copyLabel={copy.copyAction}
                        copiedLabel={copy.copiedAction}
                        callLabel={copy.callAction}
                      />
                    </div>
                  ) : null}
                  {detail.court.line_id ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.line}
                      </p>
                      <ContactActionValue
                        mode="line"
                        value={detail.court.line_id}
                        copyLabel={copy.copyAction}
                        copiedLabel={copy.copiedAction}
                        callLabel={copy.callAction}
                      />
                    </div>
                  ) : null}
                  {detail.court.line_qr_url ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.lineQr}
                      </p>
                      <LineQrLightboxImage
                        src={detail.court.line_qr_url}
                        alt="LINE QR"
                        sizes="128px"
                        className="relative mt-2 h-32 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  ) : null}
                  {detail.court.website_url ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        {copy.website}
                      </p>
                      <a
                        href={detail.court.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate font-semibold text-slate-800 underline decoration-dotted underline-offset-4"
                      >
                        {detail.court.website_url}
                      </a>
                    </div>
                  ) : null}
                </div>
              </section>

              {hasMapCoordinates ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.mapDirections}
                    </h2>
                  </div>
                  <CourtMap
                    name={detail.court.name ?? fallbackCourtName}
                    latitude={numericLatitude as number}
                    longitude={numericLongitude as number}
                    placeId={detail.court.google_place_id}
                    locale={locale}
                    eyebrow={copy.mapDirections}
                    description={copy.mapDescription}
                    openMapsLabel={copy.openGoogleMaps}
                    compact
                  />
                </section>
              ) : null}
            </aside>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </main>
    </div>
  );
}
