import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SPORT_META } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { ensureGroupLineQrUrl } from "@/server/lineQr";
import { ViewTracker } from "@/components/view-tracker";
import { BaseCard } from "@/components/base-card";
import { BaseScheduleList } from "@/components/base-schedule-list";
import { BaseBackLink } from "@/components/base-back-link";
import { ContactActionValue } from "@/components/contact-action-value";
import { ShareButton } from "@/components/share-button";
import { getPlayFormatLabel } from "@/lib/play-format";

const DAY_LABELS: Record<string, { en: string; th: string }> = {
  sunday: { en: "Sunday", th: "วันอาทิตย์" },
  monday: { en: "Monday", th: "วันจันทร์" },
  tuesday: { en: "Tuesday", th: "วันอังคาร" },
  wednesday: { en: "Wednesday", th: "วันพุธ" },
  thursday: { en: "Thursday", th: "วันพฤหัสบดี" },
  friday: { en: "Friday", th: "วันศุกร์" },
  saturday: { en: "Saturday", th: "วันเสาร์" },
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

function formatTimeRange(start: string, end: string, locale: string) {
  return `${formatTimeValue(start, locale)} – ${formatTimeValue(end, locale)}`;
}

function formatUpdatedDate(value: string | null | undefined, locale: "th" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildGoogleMapsSearchUrl({
  name,
  latitude,
  longitude,
  placeId,
}: {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
}) {
  const normalizedPlaceId = placeId?.trim() || null;
  if (normalizedPlaceId) {
    const params = new URLSearchParams({
      api: "1",
      query: `${latitude},${longitude}`,
      query_place_id: normalizedPlaceId,
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
  const fallbackParams = new URLSearchParams({
    api: "1",
    query: `${name} ${latitude},${longitude}`,
  });
  return `https://www.google.com/maps/search/?${fallbackParams.toString()}`;
}

type Params = {
  groupId: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Promise<Params>;
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

type GroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports: { code: string; name: string | null } | null;
  owner_id: string | null;
  updated_at: string | null;
  play_format: "single" | "double" | null;
  player_amount: number | null;
  allow_walk_in: boolean | null;
  phone: string | null;
  line_id: string | null;
  line_qr_url: string | null;
};

type OwnerProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type GroupPhotoRow = {
  id: string;
  image_url: string | null;
  is_primary: boolean | null;
};

type GroupSessionRow = {
  id: string;
  court_id: string;
  day: string;
  start_time: string | null;
  end_time: string | null;
  courts: {
    id: string;
    name: string | null;
    district: string | null;
    province: string | null;
    website_url: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    google_place_id: string | null;
  } | null;
};

type GroupMetadataRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports: { code: string; name: string | null } | null;
  play_format?: "single" | "double" | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[] | null;
  group_sessions?: {
    day: string;
    start_time: string | null;
    end_time: string | null;
    courts: {
      name: string | null;
      district: string | null;
      province: string | null;
    } | null;
  }[] | null;
};

type GroupMetadataCourt = NonNullable<
  NonNullable<GroupMetadataRow["group_sessions"]>[number]["courts"]
>;

function getPrimaryMetadataCourt(
  sessions: GroupMetadataRow["group_sessions"],
) {
  return (
    sessions?.find((session) => session.courts?.name)?.courts ??
    sessions?.find((session) => session.courts)?.courts ??
    null
  );
}

function buildCourtSeoLabel(
  court: GroupMetadataCourt | null,
  sportName: string,
  locale: "th" | "en",
) {
  const courtName = court?.name?.trim();
  if (!court || !courtName) return null;

  const region = court.province?.trim() || court.district?.trim() || null;
  const normalizedCourtName = courtName.toLowerCase();
  const normalizedSportName = sportName.toLowerCase();
  const hasCourtKeyword =
    normalizedCourtName.includes(normalizedSportName) ||
    normalizedCourtName.includes("court") ||
    normalizedCourtName.includes("สนาม");
  const sportCourtKeyword =
    locale === "th" ? `สนาม${sportName}` : `${sportName} court`;

  return [
    hasCourtKeyword ? null : sportCourtKeyword,
    courtName,
    region,
  ]
    .filter(Boolean)
    .join(" ");
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
  const { data } = await supabaseSelect<GroupMetadataRow>("groups", {
    select:
      "id,name,description,play_format,sports(code,name),group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,courts(name,district,province))",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = data?.[0];
  if (!group) {
    return {
      title:
        locale === "th"
          ? "ไม่พบข้อมูลกลุ่ม | RacketThailand"
          : "Group not found | RacketThailand",
    };
  }
  const sportMeta = group.sports?.code
    ? SPORT_META[group.sports.code]
    : undefined;
  const sportName =
    sportMeta?.name?.[locale] ??
    group.sports?.name ??
    (locale === "th" ? "กลุ่มกีฬาแร็กเกต" : "Sport group");
  const primaryCourt = getPrimaryMetadataCourt(group.group_sessions);
  const courtSeoLabel = buildCourtSeoLabel(primaryCourt, sportName, locale);
  const location =
    group.group_sessions
      ?.map(
        (session) =>
          session.courts?.province ??
          session.courts?.district ??
          session.courts?.name ??
          null,
      )
      .filter((value): value is string => Boolean(value && value.trim()))[0] ??
    null;
  const titleLocation = courtSeoLabel
    ? ` @ ${courtSeoLabel}`
    : location
      ? locale === "th"
        ? ` ที่ ${location}`
        : ` in ${location}`
      : "";
  const descriptionParts = [
    group.description,
    courtSeoLabel
      ? `${locale === "th" ? "สนาม" : "Court"}: ${courtSeoLabel}`
      : location
      ? `${locale === "th" ? "สถานที่" : "Location"}: ${location}`
      : null,
    group.group_sessions?.length
      ? `${
          locale === "th" ? "รอบเล่นต่อสัปดาห์" : "Sessions per week"
        }: ${group.group_sessions.length}`
      : null,
  ].filter(Boolean);
  const rawDescription =
    descriptionParts.join(" · ") ||
    (locale === "th"
      ? `ดูรายละเอียด${sportName}บน RacketThailand`
      : `${sportName} community listed on RacketThailand.`);
  const description = truncateMetaDescription(rawDescription);
  const canonicalPath = `/groups/${resolvedParams.groupId}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const heroImage =
    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
    group.group_photos?.[0]?.image_url ??
    sportMeta?.coverImage ??
    undefined;

  return {
    title: `${group.name ?? sportName}${titleLocation} | ${sportName} | RacketThailand`,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: `${group.name ?? sportName}${titleLocation} | RacketThailand`,
      description,
      url: canonical,
      type: "website",
      images: heroImage
        ? [
            {
              url: heroImage,
              alt:
                locale === "th"
                  ? `รูปกลุ่ม ${group.name ?? sportName}`
                  : `${group.name ?? sportName} group photo`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${group.name ?? sportName}${titleLocation} | RacketThailand`,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(resolvedParams.groupId)) {
    notFound();
  }
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabaseSelect<GroupRow>("groups", {
    select:
      "id,name,description,owner_id,sports(code,name),updated_at,play_format,player_amount,allow_walk_in,phone,line_id,line_qr_url",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = groups?.[0];
  if (!group) {
    notFound();
  }

  const isGroupOwner =
    sessionUser?.id && group.owner_id
      ? sessionUser.id === group.owner_id
      : false;
  const { data: viewerProfile } = sessionUser
    ? await supabase
        .from("profiles")
        .select("status")
        .eq("id", sessionUser.id)
        .single()
    : { data: null };
  const isAdminViewer = viewerProfile?.status === "admin";

  const resolvedLineQrUrl = await ensureGroupLineQrUrl(
    group.id,
    group.line_qr_url,
  );
  const displayGroup = { ...group, line_qr_url: resolvedLineQrUrl };

  const [{ data: owners }, { data: photoRows }, { data: sessionRows }] =
    await Promise.all([
      group.owner_id
        ? supabaseSelect<OwnerProfile>("profiles", {
            select: "id,display_name,username",
            id: `eq.${group.owner_id}`,
            limit: "1",
          })
        : Promise.resolve({ data: [] as OwnerProfile[] }),
      supabaseSelect<GroupPhotoRow>("group_photos", {
        select: "id,image_url,is_primary",
        group_id: `eq.${group.id}`,
        order: "is_primary.desc,created_at.asc",
      }),
      supabaseSelect<GroupSessionRow>("group_sessions", {
        select:
          "id,court_id,day,start_time,end_time,courts(id,name,district,province,website_url,latitude,longitude,google_place_id)",
        group_id: `eq.${group.id}`,
        order: "day.asc,start_time.asc",
      }),
    ]);

  const owner = owners?.[0] ?? null;
  const sportCode = group.sports?.code;
  const fallbackImage =
    SPORT_META[sportCode ?? ""]?.coverImage ?? "/sports/badminton.png";
  const filteredPhotos =
    photoRows && photoRows.length > 0
      ? photoRows
          .filter(
            (photo): photo is { id: string; image_url: string; is_primary: boolean | null } =>
              Boolean(photo.image_url),
          )
          .map((photo) => ({
            id: photo.id,
            image_url: photo.image_url as string,
            is_primary: photo.is_primary,
          }))
      : [];

  const gallery =
    filteredPhotos.length > 0
      ? filteredPhotos
      : [
          {
            id: "placeholder",
            image_url: fallbackImage,
            is_primary: true,
          },
        ];

  const sessionCourtIds = Array.from(
    new Set((sessionRows ?? []).map((session) => session.court_id).filter(Boolean)),
  ) as string[];

  let courtPhotos: { court_id: string; image_url: string | null; is_primary: boolean | null }[] = [];
  if (sessionCourtIds.length > 0) {
    const { data: courtPhotoRows } = await supabaseSelect<{
      court_id: string;
      image_url: string | null;
      is_primary: boolean | null;
    }>("court_photos", {
      select: "court_id,image_url,is_primary",
      court_id: `in.(${sessionCourtIds.join(",")})`,
      order: "is_primary.desc",
    });
    courtPhotos = courtPhotoRows ?? [];
  }

  const courtPhotoMap = new Map<string, string>();
  courtPhotos.forEach((photo) => {
    if (!photo.image_url) return;
    const existing = courtPhotoMap.get(photo.court_id);
    if (!existing || photo.is_primary) {
      courtPhotoMap.set(photo.court_id, photo.image_url);
    }
  });

  const sessionGroups = (() => {
    const map = new Map<
      string,
      {
        court: GroupSessionRow["courts"];
        sessions: GroupSessionRow[];
        photoUrl: string | null;
      }
    >();
    (sessionRows ?? []).forEach((session) => {
      const key = session.court_id;
      const existing = map.get(key);
      if (existing) {
        existing.sessions.push(session);
      } else {
        map.set(key, {
          court: session.courts,
          sessions: [session],
          photoUrl: courtPhotoMap.get(key) ?? null,
        });
      }
    });
    return Array.from(map.values());
  })();
  const canonicalPath = `/groups/${group.id}`;
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);
  const primaryImage = gallery[0]?.image_url ?? null;
  const primarySessionCourt = sessionGroups[0]?.court;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    "@id": canonicalUrl,
    name: displayGroup.name ?? (locale === "th" ? "กลุ่มชุมชน" : "Community group"),
    description: displayGroup.description ?? undefined,
    url: canonicalUrl,
    sport:
      sportCode && SPORT_META[sportCode]
        ? SPORT_META[sportCode]?.name?.[locale] ??
          SPORT_META[sportCode]?.name?.en
        : undefined,
    image: primaryImage ?? undefined,
    numberOfMembers: displayGroup.player_amount ?? undefined,
    contactPoint: displayGroup.phone
      ? [
          {
            "@type": "ContactPoint",
            telephone: displayGroup.phone,
            contactType: "customer service",
          },
        ]
      : undefined,
    organizer: owner
      ? {
          "@type": "Person",
          name: owner.display_name ?? owner.username ?? undefined,
        }
      : undefined,
    location: primarySessionCourt
      ? {
          "@type": "SportsActivityLocation",
          name: primarySessionCourt.name ?? undefined,
          address:
            primarySessionCourt.district || primarySessionCourt.province
              ? {
                  "@type": "PostalAddress",
                  addressLocality: primarySessionCourt.district ?? undefined,
                  addressRegion: primarySessionCourt.province ?? undefined,
                }
              : undefined,
        }
      : undefined,
  };

  const copy = {
    owner: t("groups.detail.owner"),
    scheduleAny: t("groups.detail.scheduleAny"),
    edit: t("groups.detail.edit"),
    sessionsTitle: t("groups.detail.sessionsTitle"),
    sessionsEmpty: t("groups.detail.sessionsEmpty"),
    playFormat: t("groups.detail.playFormat"),
    playerAmount: t("groups.detail.playerAmount"),
    walkIn: t("groups.detail.walkIn"),
    walkInsWelcome: t("groups.detail.walkInsWelcome"),
    walkInsClosed: t("groups.detail.walkInsClosed"),
    phone: t("groups.detail.phone"),
    line: t("groups.detail.line"),
    lineQr: t("groups.detail.lineQr"),
    back: t("groups.detail.back"),
    copyAction: t("contactActions.copy"),
    copiedAction: t("contactActions.copied"),
    callAction: t("contactActions.call"),
    shareAction: t("contactActions.share"),
    linkCopiedAction: t("contactActions.linkCopied"),
  };
  const fallbackGroupName =
    locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackCourtName =
    locale === "th" ? "สนามที่เชื่อมไว้" : "Linked court";
  const fallbackCourtPhotoAlt =
    locale === "th" ? "รูปสนาม" : "Court photo";
  const canEdit = Boolean(isGroupOwner || isAdminViewer);
  const sportName = group.sports?.name ?? undefined;
  const playFormatLabel = getPlayFormatLabel(group.play_format, locale);
  const shareTitle = group.name ?? fallbackGroupName;
  const shareText =
    group.description ??
    (locale === "th"
      ? `ดูรายละเอียดกลุ่ม ${shareTitle} บน RacketThailand`
      : `View ${shareTitle} on RacketThailand`);
  const updatedAtLabel = formatUpdatedDate(group.updated_at, locale);
  const primarySessionLocation = [
    primarySessionCourt?.district,
    primarySessionCourt?.province,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");
  const primarySessionCourtHref = primarySessionCourt?.id
    ? buildLocalizedPath(`/courts/${primarySessionCourt.id}`, locale)
    : null;
  const numericLatitude =
    primarySessionCourt?.latitude == null
      ? null
      : Number(primarySessionCourt.latitude);
  const numericLongitude =
    primarySessionCourt?.longitude == null
      ? null
      : Number(primarySessionCourt.longitude);
  const primarySessionMapsUrl =
    numericLatitude !== null &&
    !Number.isNaN(numericLatitude) &&
    numericLongitude !== null &&
    !Number.isNaN(numericLongitude)
      ? buildGoogleMapsSearchUrl({
          name: primarySessionCourt?.name ?? fallbackCourtName,
          latitude: numericLatitude,
          longitude: numericLongitude,
          placeId: primarySessionCourt?.google_place_id,
        })
      : null;
  const trustBadges = [
    group.allow_walk_in === false
      ? locale === "th"
        ? "ติดต่อก่อนมาเล่น"
        : "Contact before joining"
      : locale === "th"
        ? "รับวอล์กอิน"
        : "Walk-ins welcome",
    sessionGroups.length > 0
      ? locale === "th"
        ? "มีตารางเล่นประจำ"
        : "Weekly schedule"
      : null,
    group.phone || displayGroup.line_id
      ? locale === "th"
        ? "มีช่องทางติดต่อ"
        : "Direct contact"
      : null,
    updatedAtLabel
      ? locale === "th"
        ? `อัปเดต ${updatedAtLabel}`
        : `Updated ${updatedAtLabel}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const backHref = buildLocalizedPath(
    sportCode ? `/${sportCode}/group-finder` : "/",
    locale,
  );

  return (
    <div className="rt-page">
      <ViewTracker
        event="group_view"
        payload={{ groupId: group.id }}
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 text-[var(--foreground)] md:px-10">
        <HeaderSportScope sportSlug={sportCode ?? undefined} />
        <HeaderSubLabel value={sportName} />
        <BaseBackLink href={backHref}>{copy.back}</BaseBackLink>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
          <BaseCard
            as="section"
            className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.08)]"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.52)]">
              <span>{sportName ?? "RacketThailand"}</span>
              <span aria-hidden>•</span>
              <span>{locale === "th" ? "โปรไฟล์กลุ่มสาธารณะ" : "Public group profile"}</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {group.name ?? fallbackGroupName}
              </h1>
              {primarySessionLocation && (
                <p className="text-base text-[rgb(var(--foreground-rgb)/0.72)]">
                  {primarySessionLocation}
                </p>
              )}
              {group.description && (
                <p className="whitespace-pre-line text-sm text-[rgb(var(--foreground-rgb)/0.76)]">
                  {group.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex rounded-full border border-[rgb(var(--rt-primary-rgb)/0.18)] bg-[rgb(var(--rt-primary-rgb)/0.08)] px-3 py-1 text-xs font-semibold text-[var(--rt-primary)]"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {primarySessionCourtHref && (
                <Link
                  href={primarySessionCourtHref}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {locale === "th" ? "ดูสนามที่นัดเล่น" : "View linked court"}
                </Link>
              )}
              {primarySessionMapsUrl && (
                <a
                  href={primarySessionMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {locale === "th" ? "เส้นทาง / แผนที่" : "Directions / map"}
                </a>
              )}
              {primarySessionCourt?.website_url && (
                <a
                  href={primarySessionCourt.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {locale === "th" ? "เว็บไซต์สนาม" : "Court website"}
                </a>
              )}
              <ShareButton
                title={shareTitle}
                text={shareText}
                url={canonicalUrl}
                label={copy.shareAction}
                copiedLabel={copy.linkCopiedAction}
              />
              {canEdit && (
                <Link
                  href={buildLocalizedPath(`/groups/${group.id}/edit`, locale)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {copy.edit}
                </Link>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.phone && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.52)]">
                    {copy.phone}
                  </p>
                  <ContactActionValue
                    mode="phone"
                    value={group.phone}
                    copyLabel={copy.copyAction}
                    copiedLabel={copy.copiedAction}
                    callLabel={copy.callAction}
                  />
                </div>
              )}
              {displayGroup.line_id && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.52)]">
                    {copy.line}
                  </p>
                  <ContactActionValue
                    mode="line"
                    value={displayGroup.line_id}
                    copyLabel={copy.copyAction}
                    copiedLabel={copy.copiedAction}
                    callLabel={copy.callAction}
                  />
                </div>
              )}
            </div>
          </BaseCard>
          <BaseCard
            as="section"
            className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.08)]"
          >
            <CourtGallery gallery={gallery} courtName={group.name ?? fallbackGroupName} />
          </BaseCard>
        </section>
        <div className="hidden">
          <CourtGallery gallery={gallery} courtName={group.name ?? fallbackGroupName} />
        </div>
        <BaseCard
          as="section"
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            {locale === "th" ? "กลุ่ม" : "Group"} · {group.sports?.name ?? "RacketThailand"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              {group.name ?? fallbackGroupName}
            </h2>
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
                  href={buildLocalizedPath(`/groups/${group.id}/edit`, locale)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {copy.edit}
                </Link>
              )}
            </div>
          </div>
          {group.description && (
            <p className="mt-2 whitespace-pre-line text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
              {group.description}
            </p>
          )}
          <div className="mt-6 grid gap-5 rounded-3xl border border-slate-100 bg-[rgb(var(--foreground-rgb)/0.02)] px-6 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.playFormat}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {playFormatLabel}
              </p>
            </div>
            {typeof group.player_amount === "number" &&
              Number.isFinite(group.player_amount) && (
                <div>
                  <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                    {copy.playerAmount}
                  </p>
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {group.player_amount}
                  </p>
                </div>
              )}
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.walkIn}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {group.allow_walk_in === false
                  ? copy.walkInsClosed
                  : copy.walkInsWelcome}
              </p>
            </div>
            {group.phone && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.phone}
                </p>
                <ContactActionValue
                  mode="phone"
                  value={group.phone}
                  copyLabel={copy.copyAction}
                  copiedLabel={copy.copiedAction}
                  callLabel={copy.callAction}
                />
              </div>
            )}
            {displayGroup.line_id && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.line}
                </p>
                <ContactActionValue
                  mode="line"
                  value={displayGroup.line_id}
                  copyLabel={copy.copyAction}
                  copiedLabel={copy.copiedAction}
                  callLabel={copy.callAction}
                />
              </div>
            )}
            {displayGroup.line_qr_url && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.lineQr}
                </p>
                <div className="relative mt-2 h-32 w-32 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    src={displayGroup.line_qr_url}
                    alt="LINE QR"
                    fill
                    sizes="128px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>
        </BaseCard>

        <section className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {copy.sessionsTitle}
          </h2>
          {sessionGroups.length === 0 ? (
            <p className="text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {copy.sessionsEmpty}
            </p>
          ) : (
            <div className="space-y-4">
              {sessionGroups.map((entry, index) => {
                const locationLabel = [
                  entry.court?.district,
                  entry.court?.province,
                ]
                  .filter((value): value is string => Boolean(value && value.trim()))
                  .join(" · ");
                return (
                  <div
                    key={entry.court?.id ?? `session-${index}`}
                    className="space-y-2 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"
                  >
                    {entry.court ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Link
                            href={buildLocalizedPath(
                              `/courts/${entry.court.id}${
                                sportCode
                                  ? `?sport=${encodeURIComponent(sportCode)}`
                                  : ""
                              }`,
                              locale,
                            )}
                            className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--rt-primary)]"
                          >
                            {entry.court.name ?? fallbackCourtName}
                          </Link>
                          {locationLabel && (
                            <p className="text-xs uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.5)]">
                              {locationLabel}
                            </p>
                          )}
                        </div>
                        {entry.photoUrl && (
                          <div className="relative mx-auto h-36 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:mx-0">
                            <Image
                              src={entry.photoUrl}
                              alt={entry.court.name ?? fallbackCourtPhotoAlt}
                              fill
                              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 25vw"
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-base font-semibold text-[var(--foreground)]">
                        {t("groups.detail.court")}
                      </p>
                    )}
                    {entry.sessions.length > 0 ? (
                      <BaseScheduleList
                        entries={entry.sessions.map((session, sessionIndex) => ({
                          id: session.id ?? `${entry.court?.id ?? "session"}-${sessionIndex}`,
                          label: getDayLabel(session.day, locale),
                          value:
                            session.start_time && session.end_time
                              ? formatTimeRange(session.start_time, session.end_time, locale)
                              : copy.scheduleAny,
                        }))}
                        className="mt-4"
                      />
                    ) : (
                      <p className="text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
                        {copy.scheduleAny}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
