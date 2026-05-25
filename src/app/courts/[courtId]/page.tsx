import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import { BaseScheduleList } from "@/components/base-schedule-list";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCourtDetail } from "@/server/courtFinder";
import { CourtMap } from "@/components/court-map";
import { ensureAllDays } from "@/lib/opening-hours";
import { ViewTracker } from "@/components/view-tracker";
import { GroupCard, type GroupCardSession } from "@/components/group-card";
import { ContactActionValue } from "@/components/contact-action-value";
import { ShareButton } from "@/components/share-button";
import type { Locale } from "@/lib/i18n";

function getGroupCover(group: {
  sports?: { code: string } | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[] | null;
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
    court.phone
      ? `${locale === "th" ? "โทร" : "Phone"}: ${court.phone}`
      : null,
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

  return {
    title: `${court.name ?? sportName}${
      locationParts
        ? locale === "th"
          ? ` ที่ ${locationParts}`
          : ` in ${locationParts}`
        : ""
    } | ${sportName} | RacketThailand`,
    description,
    alternates: {
      canonical,
      languages: alternateLanguages,
    },
    openGraph: {
      title: `${court.name ?? sportName}${
        locationParts
          ? locale === "th"
            ? ` ที่ ${locationParts}`
            : ` in ${locationParts}`
          : ""
      } | RacketThailand`,
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
      title: `${court.name ?? sportName} | RacketThailand`,
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
            .map((range) =>
              formatRangeDisplay(range.open, range.close, locale),
            )
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
    back: t("courtPage.back"),
    groupsTitle: t("courtPage.groupsTitle"),
    groupsEmpty: t("courtPage.groupsEmpty"),
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
    groupScheduleAny: t("groups.detail.scheduleAny"),
    backToGroupFinder: t("courtPage.backToGroupFinder"),
  };
  const fallbackCourtName =
    locale === "th" ? "ยังไม่ระบุชื่อสนาม" : "Unnamed court";
  const fallbackGroupName =
    locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackGroupPhotoAlt =
    locale === "th" ? "รูปกลุ่ม" : "Group photo";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ViewTracker
        event="court_view"
        payload={{ courtId: detail.court.id }}
      />
      <HeaderSportScope sportSlug={activeSportCode ?? undefined} />
      <HeaderSubLabel value={getSportDisplayName(activeSport, locale)} />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink
          href={buildLocalizedPath(
            `/${activeSportCode ?? ""}`,
            locale,
          )}
        >
          {copy.back}
        </BaseBackLink>
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {detail.court.name ?? fallbackCourtName}
              </h1>
              <p className="text-sm text-slate-600">
                {[detail.court.district, detail.court.province]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton
                title={shareTitle}
                text={shareText}
                url={canonicalUrl}
                label={copy.shareAction}
                copiedLabel={copy.linkCopiedAction}
              />
              {canEdit && (
                <Link
                  href={buildLocalizedPath(
                    `/courts/${resolvedParams.courtId}/edit`,
                    locale,
                  )}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {copy.edit}
                </Link>
              )}
            </div>
          </div>
        </header>
        <CourtGallery gallery={gallery} courtName={detail.court.name} />

        <BaseCard
          as="section"
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 backdrop-blur"
        >
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {copy.contact}
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {detail.court.description && (
                <li>
                  <strong className="text-slate-900">
                    {copy.description}:
                  </strong>
                  <p className="mt-1 whitespace-pre-line">
                    {detail.court.description}
                  </p>
                </li>
              )}
              {detail.court.address && (
                <li>
                  <strong className="text-slate-900">
                    {copy.address}:
                  </strong>{" "}
                  {detail.court.address}
                </li>
              )}
              {detail.court.price_note && (
                <li>
                  <strong className="text-slate-900">
                    {copy.price}:
                  </strong>
                  <div
                    className="prose prose-sm mt-1 max-w-none whitespace-pre-line text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: detail.court.price_note,
                    }}
                  />
                </li>
              )}
              {hasAnyHours && (
                <li>
              <strong className="text-slate-900">
                {copy.hours}:
              </strong>
                  <BaseScheduleList entries={openingHourRows} className="mt-2" />
                </li>
              )}
              {detail.court.phone && (
                <li className="space-y-1">
                  <strong className="text-slate-900">
                    {copy.phone}:
                  </strong>
                  <ContactActionValue
                    mode="phone"
                    value={detail.court.phone}
                    copyLabel={copy.copyAction}
                    copiedLabel={copy.copiedAction}
                    callLabel={copy.callAction}
                  />
                </li>
              )}
              {detail.court.line_id && (
                <li className="space-y-1">
                  <strong className="text-slate-900">
                    {copy.line}:
                  </strong>
                  <ContactActionValue
                    mode="line"
                    value={detail.court.line_id}
                    copyLabel={copy.copyAction}
                    copiedLabel={copy.copiedAction}
                    callLabel={copy.callAction}
                  />
                </li>
              )}
              {detail.court.line_qr_url && (
                <li className="space-y-2">
                  <strong className="text-slate-900">{copy.lineQr}:</strong>
                  <div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <Image
                      src={detail.court.line_qr_url}
                      alt="LINE QR"
                      fill
                      sizes="144px"
                      className="object-contain"
                    />
                  </div>
                </li>
              )}
              {detail.court.website_url && (
                <li>
                  <strong className="text-slate-900">
                    {copy.website}:
                  </strong>{" "}
                  <a
                    href={detail.court.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-900 underline"
                  >
                    {detail.court.website_url}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </BaseCard>

        {hasMapCoordinates && (
          <CourtMap
            name={detail.court.name ?? (locale === "th" ? "ตำแหน่งสนาม" : "Court location")}
            latitude={numericLatitude as number}
            longitude={numericLongitude as number}
            placeId={detail.court.google_place_id}
          />
        )}

        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white px-6 py-8"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {copy.groupsTitle}
          </h2>
          {detail.groups.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{copy.groupsEmpty}</p>
          ) : (
            <div className="mt-5 space-y-8">
              {groupSections.map((section) => (
                <section key={section.code} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {section.label}
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      {locale === "th"
                        ? `${section.groups.length.toLocaleString("th-TH")} กลุ่ม`
                        : `${section.groups.length.toLocaleString("en-US")} groups`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {section.groups.map((group) => {
                      const status = group.verification_status ?? "pending";
                      const statusLabel =
                        status === "verified" ? copy.verified : null;
                      const groupSportCode = group.groups?.sports?.code ?? null;
                      const groupLink = group.groups?.id
                        ? buildLocalizedPath(
                            `/groups/${group.groups.id}${
                              groupSportCode
                                ? `?sport=${encodeURIComponent(groupSportCode)}`
                                : ""
                            }`,
                            locale,
                          )
                        : null;
                      const coverImage = group.groups
                        ? getGroupCover(group.groups)
                        : "/sports/badminton.png";
                      const scheduleEntries =
                        group.groups?.group_sessions &&
                        Array.isArray(group.groups.group_sessions)
                          ? group.groups.group_sessions.filter(
                              (session) => session.court_id === detail.court.id,
                            )
                          : [];
                      const sessionsForCourt: GroupCardSession[] =
                        scheduleEntries.map((session) => ({
                          day: session.day,
                          start_time: session.start_time,
                          end_time: session.end_time,
                          courts: null,
                        }));
                      return (
                        <GroupCard
                          key={group.id}
                          href={groupLink}
                          name={group.groups?.name ?? fallbackGroupName}
                          imageUrl={coverImage}
                          imageAlt={group.groups?.name ?? fallbackGroupPhotoAlt}
                          sessions={sessionsForCourt}
                          playFormat={group.groups?.play_format ?? null}
                          allowWalkIn={group.groups?.allow_walk_in ?? null}
                          verifiedLabel={statusLabel}
                          verifiedTooltip={
                            statusLabel ? copy.verifiedTooltip : null
                          }
                          dayLabels={dayLabels}
                          scheduleAnytime={copy.groupScheduleAny}
                          locale={locale as Locale}
                          sessionLimit={3}
                          showSessions
                          className="text-sm text-[var(--foreground)]"
                          titleClassName="text-sm font-medium text-[var(--foreground)] sm:text-base"
                          imageAspectClass="aspect-square"
                          description={group.groups?.description ?? null}
                          showDescription
                          showLocation={false}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
          <BaseBackLink
            href={buildLocalizedPath(
              `/${activeSportCode ?? ""}/group-finder`,
              locale,
            )}
            className="mt-6 inline-flex w-fit"
          >
            {copy.backToGroupFinder}
          </BaseBackLink>
        </BaseCard>
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
