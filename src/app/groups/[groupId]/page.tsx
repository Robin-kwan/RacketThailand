import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { SPORT_META } from "@/data/sportMeta";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { normalizeGroupStatus } from "@/lib/group-status";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { ensureGroupLineQrUrl } from "@/server/lineQr";
import { ViewTracker } from "@/components/view-tracker";
import { ContactActionValue } from "@/components/contact-action-value";
import { ShareButton } from "@/components/share-button";
import { LineQrLightboxImage } from "@/components/line-qr-lightbox-image";
import {
  GroupEventEditor,
  GroupWeeklySessionEditor,
} from "@/components/groups/group-session-editor";
import { GroupSessionForm } from "@/components/groups/group-session-form";
import { getPlayFormatLabel } from "@/lib/play-format";
import { localizeThailandLocation } from "@/server/thailand-location";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Images,
  Info,
  MapPin,
  Repeat2,
  Users,
} from "lucide-react";

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

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

function compareWeeklySessions(
  a: Pick<GroupSessionRow, "day" | "start_time">,
  b: Pick<GroupSessionRow, "day" | "start_time">,
) {
  const aDay = WEEKDAY_ORDER.indexOf(a.day.toLowerCase());
  const bDay = WEEKDAY_ORDER.indexOf(b.day.toLowerCase());
  const dayComparison =
    (aDay === -1 ? WEEKDAY_ORDER.length : aDay) -
    (bDay === -1 ? WEEKDAY_ORDER.length : bDay);

  return (
    dayComparison || (a.start_time ?? "").localeCompare(b.start_time ?? "")
  );
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

function getSportGroupLabel(
  sportCode: string | undefined,
  sportName: string,
  locale: "th" | "en",
) {
  if (locale === "en") return `${sportName} group`;
  if (sportCode === "badminton") return "ก๊วนแบดมินตัน";
  return `กลุ่ม${sportName}`;
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
  status: string | null;
  sport_id: string | null;
  sports: { code: string; name: string | null } | null;
  owner_id: string | null;
  updated_at: string | null;
  play_format: "single" | "double" | null;
  player_amount: number | null;
  allow_walk_in: boolean | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  line_qr_url: string | null;
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
    district_id?: number | null;
    province_id?: number | null;
  } | null;
};

type GroupCourtLinkRow = {
  court_id: string;
  courts: GroupSessionRow["courts"];
};

type GroupEventRow = {
  id: string;
  court_id: string | null;
  venue_name: string | null;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  courts: GroupSessionRow["courts"];
};

type GroupMetadataRow = {
  id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  owner_id: string | null;
  sports: { code: string; name: string | null } | null;
  play_format?: "single" | "double" | null;
  group_photos?:
    { image_url: string | null; is_primary: boolean | null }[] | null;
  group_sessions?:
    | {
        day: string;
        start_time: string | null;
        end_time: string | null;
        courts: {
          name: string | null;
          district: string | null;
          province: string | null;
          district_id?: number | null;
          province_id?: number | null;
        } | null;
      }[]
    | null;
};

type GroupMetadataCourt = NonNullable<
  NonNullable<GroupMetadataRow["group_sessions"]>[number]["courts"]
>;

function getPrimaryMetadataCourt(sessions: GroupMetadataRow["group_sessions"]) {
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

  return [hasCourtKeyword ? null : sportCourtKeyword, courtName, region]
    .filter(Boolean)
    .join(" ");
}

function normalizeExternalHref(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function formatDateTimeInThailand(
  value: string,
  locale: "th" | "en",
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    timeZone: "Asia/Bangkok",
    ...options,
  }).format(new Date(value));
}

function formatEventDateParts(value: string, locale: "th" | "en") {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { timeZone: "Asia/Bangkok" },
  );
  return {
    weekday: new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      timeZone: "Asia/Bangkok",
      weekday: "short",
    }).format(date),
    day: formatter.formatToParts(date).find((part) => part.type === "day")
      ?.value,
    month: new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      timeZone: "Asia/Bangkok",
      month: "short",
    }).format(date),
  };
}

function normalizeLineHref(value: string) {
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("@")) {
    return `https://line.me/R/ti/p/${encodeURIComponent(normalized)}`;
  }
  return `https://line.me/ti/p/~${encodeURIComponent(normalized)}`;
}

function formatEventTime(value: string, locale: "th" | "en") {
  return formatDateTimeInThailand(value, locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventTimeRange(
  startsAt: string,
  endsAt: string | null,
  locale: "th" | "en",
) {
  const start = formatEventTime(startsAt, locale);
  const end = endsAt ? formatEventTime(endsAt, locale) : null;
  return end ? `${start} – ${end}` : start;
}

async function fetchUpcomingGroupEvents(groupId: string) {
  try {
    const { data } = await supabaseSelect<GroupEventRow>("group_events", {
      select:
        "id,court_id,venue_name,starts_at,ends_at,notes,courts(id,name,district,district_id,province,province_id)",
      group_id: `eq.${groupId}`,
      starts_at: `gte.${new Date().toISOString()}`,
      order: "starts_at.asc",
      limit: "8",
    });
    return data ?? [];
  } catch (error) {
    console.warn("Unable to load group upcoming sessions.", error);
    return [];
  }
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
  const supabase = await createSupabaseServerClient();
  let data: GroupMetadataRow[] = [];
  try {
    const result = await supabaseSelect<GroupMetadataRow>("groups", {
      select:
        "id,name,description,status,owner_id,play_format,sports(code,name),group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,courts(name,district,district_id,province,province_id))",
      id: `eq.${resolvedParams.groupId}`,
      limit: "1",
    });
    data = result.data;
  } catch (error) {
    console.error("Unable to load group metadata.", error);
    return {
      title:
        locale === "th"
          ? "ข้อมูลกลุ่ม | RacketThailand"
          : "Group details | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const group = data?.[0]
    ? {
        ...data[0],
        group_sessions: data[0].group_sessions
          ? await Promise.all(
              data[0].group_sessions.map(async (session) => {
                if (!session.courts) {
                  return session;
                }
                const localized = await localizeThailandLocation(
                  session.courts,
                  locale,
                );
                return {
                  ...session,
                  courts: {
                    ...session.courts,
                    district: localized.district,
                    province: localized.province,
                  },
                };
              }),
            )
          : data[0].group_sessions,
      }
    : null;
  if (!group) {
    return {
      title:
        locale === "th"
          ? "ไม่พบข้อมูลกลุ่ม | RacketThailand"
          : "Group not found | RacketThailand",
    };
  }
  const groupStatus = normalizeGroupStatus(group.status);
  if (groupStatus === "draft") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isGroupOwner = Boolean(user?.id && user.id === group.owner_id);
    const { data: viewerProfile } = user
      ? await supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };
    const isAdminViewer = viewerProfile?.status === "admin";

    if (!isGroupOwner && !isAdminViewer) {
      return {
        title:
          locale === "th"
            ? "ไม่พบข้อมูลกลุ่ม | RacketThailand"
            : "Group not found | RacketThailand",
        robots: {
          index: false,
          follow: false,
        },
      };
    }
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
  const sportGroupLabel = getSportGroupLabel(
    group.sports?.code,
    sportName,
    locale,
  );
  const metadataTitle = `${group.name ?? sportName} - ${sportGroupLabel} | RacketThailand`;

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical,
      languages: alternates,
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
                  ? `รูปกลุ่ม ${group.name ?? sportName}`
                  : `${group.name ?? sportName} group photo`,
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
    robots:
      groupStatus === "draft"
        ? {
            index: false,
            follow: false,
          }
        : undefined,
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
      "id,name,description,status,sport_id,owner_id,sports(code,name),updated_at,play_format,player_amount,allow_walk_in,phone,line_id,website_url,line_qr_url",
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
  const groupStatus = normalizeGroupStatus(group.status);

  if (groupStatus === "draft" && !isGroupOwner && !isAdminViewer) {
    notFound();
  }

  const resolvedLineQrUrl = await ensureGroupLineQrUrl(
    group.id,
    group.line_qr_url,
  );
  const displayGroup = { ...group, line_qr_url: resolvedLineQrUrl };

  const [
    { data: photoRows },
    { data: sessionRows },
    { data: linkedCourtRows },
  ] = await Promise.all([
    supabaseSelect<GroupPhotoRow>("group_photos", {
      select: "id,image_url,is_primary",
      group_id: `eq.${group.id}`,
      order: "is_primary.desc,created_at.asc",
    }),
    supabaseSelect<GroupSessionRow>("group_sessions", {
      select:
        "id,court_id,day,start_time,end_time,courts(id,name,district,district_id,province,province_id)",
      group_id: `eq.${group.id}`,
      order: "day.asc,start_time.asc",
    }),
    supabaseSelect<GroupCourtLinkRow>("court_groups", {
      select:
        "court_id,courts(id,name,district,district_id,province,province_id)",
      group_id: `eq.${group.id}`,
      order: "created_at.asc",
    }),
  ]);
  const upcomingEventRows = await fetchUpcomingGroupEvents(group.id);

  const sportCode = group.sports?.code;
  const fallbackImage =
    SPORT_META[sportCode ?? ""]?.coverImage ?? "/sports/badminton.png";
  const filteredPhotos =
    photoRows && photoRows.length > 0
      ? photoRows
          .filter(
            (
              photo,
            ): photo is {
              id: string;
              image_url: string;
              is_primary: boolean | null;
            } => Boolean(photo.image_url),
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
            allowFullscreen: false,
          },
        ];

  const localizedSessionRows = await Promise.all(
    (sessionRows ?? []).map(async (session) => {
      if (!session.courts) {
        return session;
      }
      const localized = await localizeThailandLocation(session.courts, locale);
      return {
        ...session,
        courts: {
          ...session.courts,
          district: localized.district,
          province: localized.province,
        },
      };
    }),
  );
  const localizedLinkedCourtRows = await Promise.all(
    (linkedCourtRows ?? []).map(async (link) => {
      if (!link.courts) {
        return link;
      }
      const localized = await localizeThailandLocation(link.courts, locale);
      return {
        ...link,
        courts: {
          ...link.courts,
          district: localized.district,
          province: localized.province,
        },
      };
    }),
  );
  const localizedUpcomingEvents = await Promise.all(
    upcomingEventRows.map(async (event) => {
      if (!event.courts) {
        return event;
      }
      const localized = await localizeThailandLocation(event.courts, locale);
      return {
        ...event,
        courts: {
          ...event.courts,
          district: localized.district,
          province: localized.province,
        },
      };
    }),
  );

  const sessionCourtIds = Array.from(
    new Set(
      [
        ...localizedSessionRows.map((session) => session.court_id),
        ...localizedLinkedCourtRows.map((link) => link.court_id),
      ].filter(Boolean),
    ),
  ) as string[];

  let courtPhotos: {
    court_id: string;
    image_url: string | null;
    is_primary: boolean | null;
  }[] = [];
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

  const sortedSessionRows = [...localizedSessionRows].sort(
    compareWeeklySessions,
  );
  const weeklyTimetable = WEEKDAY_ORDER.map((day) => ({
    day,
    label: getDayLabel(day, locale),
    sessions: sortedSessionRows.filter(
      (session) => session.day.toLowerCase() === day,
    ),
  })).filter((entry) => entry.sessions.length > 0);

  const sessionGroups = (() => {
    const map = new Map<
      string,
      {
        court: GroupSessionRow["courts"];
        sessions: GroupSessionRow[];
        photoUrl: string | null;
      }
    >();
    sortedSessionRows.forEach((session) => {
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
    localizedLinkedCourtRows.forEach((link) => {
      if (map.has(link.court_id)) return;
      map.set(link.court_id, {
        court: link.courts,
        sessions: [],
        photoUrl: courtPhotoMap.get(link.court_id) ?? null,
      });
    });
    return Array.from(map.values());
  })();
  const linkedCourtsWithoutSessions = sessionGroups.filter(
    (entry) => entry.sessions.length === 0,
  );
  const canonicalPath = `/groups/${group.id}`;
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);
  const primaryImage = gallery[0]?.image_url ?? null;
  const primarySessionCourt = sessionGroups[0]?.court;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    "@id": canonicalUrl,
    name:
      displayGroup.name ?? (locale === "th" ? "กลุ่มชุมชน" : "Community group"),
    description: displayGroup.description ?? undefined,
    url: canonicalUrl,
    sport:
      sportCode && SPORT_META[sportCode]
        ? (SPORT_META[sportCode]?.name?.[locale] ??
          SPORT_META[sportCode]?.name?.en)
        : undefined,
    image: primaryImage ?? undefined,
    sameAs: displayGroup.website_url
      ? [normalizeExternalHref(displayGroup.website_url)]
      : undefined,
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
    scheduleAny: t("groups.detail.scheduleAny"),
    edit: t("groups.detail.edit"),
    upcomingTitle: t("groups.detail.upcomingTitle"),
    upcomingVenueFallback: t("groups.detail.upcomingVenueFallback"),
    sessionsTitle: t("groups.detail.sessionsTitle"),
    sessionsEmpty: t("groups.detail.sessionsEmpty"),
    playFormat: t("groups.detail.playFormat"),
    playerAmount: t("groups.detail.playerAmount"),
    walkIn: t("groups.detail.walkIn"),
    walkInsWelcome: t("groups.detail.walkInsWelcome"),
    walkInsClosed: t("groups.detail.walkInsClosed"),
    phone: t("groups.detail.phone"),
    line: t("groups.detail.line"),
    website: t("groups.detail.website"),
    lineQr: t("groups.detail.lineQr"),
    groupDetails: t("groups.detail.groupDetails"),
    regularVenues: t("groups.detail.regularVenues"),
    contactGroup: t("groups.detail.contactGroup"),
    viewCourt: t("groups.detail.viewCourt"),
    aboutGroup: t("groups.detail.aboutGroup"),
    groupPhotos: t("groups.detail.groupPhotos"),
    back: t("groups.detail.back"),
    copyAction: t("contactActions.copy"),
    copiedAction: t("contactActions.copied"),
    callAction: t("contactActions.call"),
    shareAction: t("contactActions.share"),
    linkCopiedAction: t("contactActions.linkCopied"),
    sessionForm: {
      title: t("groups.detail.sessionForm.title"),
      description: t("groups.detail.sessionForm.description"),
      weeklyMode: t("groups.detail.sessionForm.weeklyMode"),
      dateMode: t("groups.detail.sessionForm.dateMode"),
      courtLabel: t("groups.detail.sessionForm.courtLabel"),
      courtPlaceholder: t("groups.detail.sessionForm.courtPlaceholder"),
      dayLabel: t("groups.detail.sessionForm.dayLabel"),
      dateLabel: t("groups.detail.sessionForm.dateLabel"),
      startLabel: t("groups.detail.sessionForm.startLabel"),
      endLabel: t("groups.detail.sessionForm.endLabel"),
      notesLabel: t("groups.detail.sessionForm.notesLabel"),
      notesPlaceholder: t("groups.detail.sessionForm.notesPlaceholder"),
      submit: t("groups.detail.sessionForm.submit"),
      submitting: t("groups.detail.sessionForm.submitting"),
      success: t("groups.detail.sessionForm.success"),
      error: t("groups.detail.sessionForm.error"),
      required: t("groups.detail.sessionForm.required"),
      dateRangeError: t("groups.detail.sessionForm.dateRangeError"),
      courtSportMismatch: t("groups.detail.sessionForm.courtSportMismatch"),
      noCourts: t("groups.detail.sessionForm.noCourts"),
      clearTime: t("groups.detail.sessionForm.clearTime"),
      quickCourtAddOption: t("groups.form.quickCourtAddOption"),
      quickCourtTitle: t("groups.form.quickCourtTitle"),
      quickCourtName: t("groups.form.quickCourtName"),
      quickCourtNamePlaceholder: t("groups.form.quickCourtNamePlaceholder"),
      quickCourtPlaceSearch: t("groups.form.quickCourtPlaceSearch"),
      quickCourtPlaceHelper: t("groups.form.quickCourtPlaceHelper"),
      quickCourtNoResults: t("groups.form.quickCourtNoResults"),
      quickCourtDuplicateLabel: t("groups.form.quickCourtDuplicateLabel"),
      quickCourtDuplicateLinkLabel: t(
        "groups.form.quickCourtDuplicateLinkLabel",
      ),
      quickCourtLocationPreview: t("groups.form.quickCourtLocationPreview"),
      quickCourtMapTitle: t("groups.form.quickCourtMapTitle"),
      quickCourtSave: t("groups.form.quickCourtSave"),
      quickCourtSaving: t("groups.form.quickCourtSaving"),
      quickCourtCancel: t("groups.form.quickCourtCancel"),
      quickCourtNameRequired: t("groups.form.quickCourtNameRequired"),
      quickCourtPlaceRequired: t("groups.form.quickCourtPlaceRequired"),
      quickCourtDuplicateError: t("groups.form.quickCourtDuplicateError"),
      quickCourtLocationIncomplete: t(
        "groups.form.quickCourtLocationIncomplete",
      ),
      quickCourtCreateError: t("groups.form.quickCourtCreateError"),
    },
    sessionEdit: {
      edit: t("groups.detail.sessionEdit.edit"),
      title: t("groups.detail.sessionEdit.title"),
      add: t("groups.detail.sessionEdit.add"),
      remove: t("groups.detail.sessionEdit.remove"),
      save: t("groups.detail.sessionEdit.save"),
      saving: t("groups.detail.sessionEdit.saving"),
      cancel: t("groups.detail.sessionEdit.cancel"),
      success: t("groups.detail.sessionEdit.success"),
      error: t("groups.detail.sessionEdit.error"),
      required: t("groups.detail.sessionEdit.required"),
      dayLabel: t("groups.detail.sessionForm.dayLabel"),
      dateLabel: t("groups.detail.sessionForm.dateLabel"),
      startLabel: t("groups.detail.sessionForm.startLabel"),
      endLabel: t("groups.detail.sessionForm.endLabel"),
      notesLabel: t("groups.detail.sessionForm.notesLabel"),
      notesPlaceholder: t("groups.detail.sessionForm.notesPlaceholder"),
      clearTime: t("groups.detail.sessionForm.clearTime"),
      empty: t("groups.detail.sessionEdit.empty"),
      dateRangeError: t("groups.detail.sessionForm.dateRangeError"),
      removeCourt: t("groups.detail.sessionEdit.removeCourt"),
      removeCourtConfirm: t("groups.detail.sessionEdit.removeCourtConfirm"),
      removeCourtSuccess: t("groups.detail.sessionEdit.removeCourtSuccess"),
      removeCourtError: t("groups.detail.sessionEdit.removeCourtError"),
      deleteEvent: t("groups.detail.sessionEdit.deleteEvent"),
      deleteEventConfirm: t("groups.detail.sessionEdit.deleteEventConfirm"),
      deleteEventSuccess: t("groups.detail.sessionEdit.deleteEventSuccess"),
      deleteEventError: t("groups.detail.sessionEdit.deleteEventError"),
      deleteWeeklySession: t("groups.detail.sessionEdit.deleteWeeklySession"),
      deleteWeeklySessionConfirm: t(
        "groups.detail.sessionEdit.deleteWeeklySessionConfirm",
      ),
      deleteWeeklySessionSuccess: t(
        "groups.detail.sessionEdit.deleteWeeklySessionSuccess",
      ),
      deleteWeeklySessionError: t(
        "groups.detail.sessionEdit.deleteWeeklySessionError",
      ),
    },
  };
  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayOptions = dayKeys.map((day) => ({
    value: day,
    label: t(`groups.days.${day}`),
  }));
  const fallbackGroupName = locale === "th" ? "กลุ่มชุมชน" : "Community group";
  const fallbackCourtName =
    locale === "th" ? "สนามที่เชื่อมไว้" : "Linked court";
  const canEdit = Boolean(isGroupOwner || isAdminViewer);
  const sportName = group.sports?.name ?? undefined;
  const playFormatLabel = getPlayFormatLabel(group.play_format, locale);
  const shareTitle = group.name ?? fallbackGroupName;
  const shareText =
    group.description ??
    (locale === "th"
      ? `ดูรายละเอียดกลุ่ม ${shareTitle} บน RacketThailand`
      : `View ${shareTitle} on RacketThailand`);
  const primaryContact = displayGroup.line_id
    ? {
        href: normalizeLineHref(displayGroup.line_id),
        external: true,
      }
    : group.phone
      ? {
          href: `tel:${group.phone.replace(/[^\d+]/g, "") || group.phone}`,
          external: false,
        }
      : displayGroup.website_url
        ? {
            href: normalizeExternalHref(displayGroup.website_url),
            external: true,
          }
        : null;
  return (
    <div className="min-h-screen bg-[#f7fbf9] text-[var(--foreground)]">
      <ViewTracker event="group_view" payload={{ groupId: group.id }} />
      <HeaderSportScope sportSlug={sportCode ?? undefined} />
      <HeaderSubLabel value={sportName} />
      <main className="pb-16 text-[var(--foreground)] md:pb-20">
        <section
          className={`relative overflow-hidden bg-[#081f17] text-white ${gallery.length === 0 ? "border-y border-white/10" : ""}`}
        >
          {gallery.length > 0 ? (
            <>
              <div className="absolute inset-0">
                <CourtGallery
                  gallery={gallery}
                  courtName={group.name ?? fallbackGroupName}
                  variant="hero"
                />
              </div>
              <div className="absolute inset-0 bg-[#05140f]/55" />
              <div className="absolute inset-y-0 left-0 w-full bg-[#05140f]/45 md:w-3/4" />
            </>
          ) : null}
          <div
            className={`relative mx-auto flex max-w-screen-xl items-end px-6 py-6 md:px-10 md:py-10 ${gallery.length > 0 ? "min-h-[260px] md:min-h-[390px]" : "min-h-[220px] md:min-h-[340px]"}`}
          >
            <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {group.name ?? fallbackGroupName}
                </h1>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {primaryContact && (
                  <a
                    href={primaryContact.href}
                    target={primaryContact.external ? "_blank" : undefined}
                    rel={primaryContact.external ? "noreferrer" : undefined}
                    className="rt-btn-group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
                  >
                    {copy.contactGroup}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
                <ShareButton
                  title={shareTitle}
                  text={shareText}
                  url={canonicalUrl}
                  label={copy.shareAction}
                  copiedLabel={copy.linkCopiedAction}
                  className="border-white/35 bg-white/10 text-white hover:border-white/70 hover:bg-white/15"
                />
                {canEdit && (
                  <>
                    <Link
                      href={buildLocalizedPath(
                        `/groups/${group.id}/players`,
                        locale,
                      )}
                      className="rt-btn-group inline-flex items-center justify-center px-4 py-2 text-sm"
                    >
                      {t("playerFinder.groupInvite.title")}
                    </Link>
                    <Link
                      href={buildLocalizedPath(
                        `/groups/${group.id}/edit`,
                        locale,
                      )}
                      className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/15"
                    >
                      {copy.edit}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-6 pt-8 md:px-10 md:pt-9">
          {groupStatus === "draft" && (isGroupOwner || isAdminViewer) ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900">
              <p className="font-semibold">Draft preview</p>
              <p className="mt-1">
                This group is hidden from the public website until an admin
                changes it to published.
              </p>
            </section>
          ) : null}
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-8">
              {gallery.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Images className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.groupPhotos}
                    </h2>
                    <span className="text-sm text-slate-500">
                      {gallery.length}
                    </span>
                  </div>
                  <CourtGallery
                    gallery={gallery}
                    courtName={group.name ?? fallbackGroupName}
                    variant="grid"
                  />
                </section>
              )}

              {group.description && (
                <section className="space-y-4 border-t border-slate-200 pt-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      <Info className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.aboutGroup}
                    </h2>
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
                    {group.description}
                  </p>
                </section>
              )}

              {canEdit && group.sport_id && (
                <GroupSessionForm
                  groupId={group.id}
                  sportId={group.sport_id}
                  locale={locale}
                  dayOptions={dayOptions}
                  copy={copy.sessionForm}
                />
              )}

              {localizedUpcomingEvents.length > 0 && (
                <section className="space-y-4 border-b border-slate-200 pb-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                      <CalendarDays className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.upcomingTitle}
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {localizedUpcomingEvents.map((event) => {
                      const locationLabel = [
                        event.courts?.district,
                        event.courts?.province,
                      ]
                        .filter((value): value is string =>
                          Boolean(value && value.trim()),
                        )
                        .join(", ");
                      const venueLabel =
                        event.courts?.name ??
                        event.venue_name ??
                        copy.upcomingVenueFallback;
                      const eventDate = formatEventDateParts(
                        event.starts_at,
                        locale,
                      );
                      return (
                        <article
                          key={event.id}
                          className="flex items-start gap-5 py-5"
                        >
                          <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-slate-50 px-2 py-3 text-center">
                            <span className="text-[11px] font-semibold text-blue-700">
                              {eventDate.weekday}
                            </span>
                            <span className="mt-1 text-2xl font-semibold leading-none text-slate-950">
                              {eventDate.day ?? "-"}
                            </span>
                            <span className="mt-1 text-xs text-slate-500">
                              {eventDate.month}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="flex items-center gap-2 font-semibold text-slate-950">
                                  <Clock3
                                    className="size-4 text-blue-700"
                                    aria-hidden
                                  />
                                  {formatEventTimeRange(
                                    event.starts_at,
                                    event.ends_at,
                                    locale,
                                  )}
                                </p>
                                {event.courts?.id ? (
                                  <Link
                                    href={buildLocalizedPath(
                                      `/courts/${event.courts.id}${sportCode ? `?sport=${encodeURIComponent(sportCode)}` : ""}`,
                                      locale,
                                    )}
                                    className="mt-2 block truncate text-sm font-semibold text-slate-800 hover:text-blue-700"
                                  >
                                    {venueLabel}
                                  </Link>
                                ) : (
                                  <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                                    {venueLabel}
                                  </p>
                                )}
                                {locationLabel && (
                                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                    <MapPin className="size-3.5" aria-hidden />
                                    {locationLabel}
                                  </p>
                                )}
                              </div>
                              {canEdit && event.court_id && (
                                <GroupEventEditor
                                  groupId={group.id}
                                  eventId={event.id}
                                  courtId={event.court_id}
                                  startsAt={event.starts_at}
                                  endsAt={event.ends_at}
                                  notes={event.notes}
                                  locale={locale}
                                  copy={copy.sessionEdit}
                                />
                              )}
                            </div>
                            {event.notes && (
                              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                                {event.notes}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Repeat2 className="size-4" aria-hidden />
                  </span>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {copy.sessionsTitle}
                  </h2>
                </div>
                {weeklyTimetable.length === 0 ? (
                  <p className="text-sm text-slate-600">{copy.sessionsEmpty}</p>
                ) : (
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {weeklyTimetable.map((dayEntry) => (
                      <section
                        key={dayEntry.day}
                        className="grid gap-3 py-5 sm:grid-cols-[7rem_minmax(0,1fr)]"
                      >
                        <p className="text-base font-semibold text-[var(--rt-primary)]">
                          {dayEntry.label}
                        </p>
                        <div className="space-y-4">
                          {dayEntry.sessions.map((session) => {
                            const locationLabel = [
                              session.courts?.district,
                              session.courts?.province,
                            ]
                              .filter((value): value is string =>
                                Boolean(value && value.trim()),
                              )
                              .join(", ");
                            const courtLabel =
                              session.courts?.name ?? fallbackCourtName;
                            const courtHref = session.courts?.id
                              ? buildLocalizedPath(
                                  `/courts/${session.courts.id}${sportCode ? `?sport=${encodeURIComponent(sportCode)}` : ""}`,
                                  locale,
                                )
                              : null;
                            return (
                              <div
                                key={session.id}
                                className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-start"
                              >
                                <p className="font-semibold text-slate-950">
                                  {session.start_time && session.end_time
                                    ? formatTimeRange(
                                        session.start_time,
                                        session.end_time,
                                        locale,
                                      )
                                    : copy.scheduleAny}
                                </p>
                                <div className="min-w-0">
                                  {courtHref ? (
                                    <Link
                                      href={courtHref}
                                      className="block truncate text-sm font-semibold text-slate-700 hover:text-[var(--rt-primary)]"
                                    >
                                      {courtLabel}
                                    </Link>
                                  ) : (
                                    <p className="truncate text-sm font-semibold text-slate-700">
                                      {courtLabel}
                                    </p>
                                  )}
                                  {locationLabel && (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                      <MapPin
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                      {locationLabel}
                                    </p>
                                  )}
                                </div>
                                {canEdit && (
                                  <GroupWeeklySessionEditor
                                    groupId={group.id}
                                    sessionId={session.id}
                                    courtId={session.court_id}
                                    day={session.day}
                                    startTime={session.start_time}
                                    endTime={session.end_time}
                                    dayOptions={dayOptions}
                                    copy={copy.sessionEdit}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {linkedCourtsWithoutSessions.length > 0 && (
                  <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    {linkedCourtsWithoutSessions.map((entry, index) => {
                      const court = entry.court;
                      const courtHref = court?.id
                        ? buildLocalizedPath(
                            `/courts/${court.id}${sportCode ? `?sport=${encodeURIComponent(sportCode)}` : ""}`,
                            locale,
                          )
                        : null;
                      return (
                        <div
                          key={court?.id ?? `linked-court-${index}`}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          {courtHref ? (
                            <Link
                              href={courtHref}
                              className="truncate text-sm font-semibold text-slate-700 hover:text-[var(--rt-primary)]"
                            >
                              {court?.name ?? fallbackCourtName}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {court?.name ?? fallbackCourtName}
                            </p>
                          )}
                          <span className="shrink-0 text-xs text-slate-500">
                            {copy.scheduleAny}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {sessionGroups.length > 0 && (
                <section className="space-y-5 border-t border-slate-200 pt-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.regularVenues}
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {sessionGroups.map((entry, index) => {
                      const court = entry.court;
                      const courtHref = court?.id
                        ? buildLocalizedPath(
                            `/courts/${court.id}${sportCode ? `?sport=${encodeURIComponent(sportCode)}` : ""}`,
                            locale,
                          )
                        : null;
                      const location = [court?.district, court?.province]
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <div
                          key={court?.id ?? index}
                          className="flex items-center gap-4 py-4"
                        >
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {entry.photoUrl ? (
                              <Image
                                src={entry.photoUrl}
                                alt={court?.name ?? fallbackCourtName}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <MapPin className="absolute inset-0 m-auto size-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-950">
                              {court?.name ?? fallbackCourtName}
                            </p>
                            {location && (
                              <p className="mt-1 text-sm text-slate-500">
                                {location}
                              </p>
                            )}
                          </div>
                          {courtHref && (
                            <Link
                              href={courtHref}
                              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
                            >
                              {copy.viewCourt}
                              <ExternalLink className="size-3.5" aria-hidden />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24">
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    <Users className="size-4" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {copy.groupDetails}
                  </h2>
                </div>
                <div className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-1">
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
                    <div className="min-w-0">
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
                    <div className="min-w-0">
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
                  {displayGroup.website_url && (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                        {copy.website}
                      </p>
                      <a
                        href={normalizeExternalHref(displayGroup.website_url)}
                        target="_blank"
                        rel="noreferrer"
                        title={displayGroup.website_url}
                        className="mt-1 block min-w-0 max-w-full truncate text-base font-semibold text-[var(--foreground)] underline decoration-dotted underline-offset-4 sm:max-w-[22rem]"
                      >
                        {displayGroup.website_url}
                      </a>
                    </div>
                  )}
                  {displayGroup.line_qr_url && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                        {copy.lineQr}
                      </p>
                      <LineQrLightboxImage
                        src={displayGroup.line_qr_url}
                        alt="LINE QR"
                        sizes="128px"
                        className="relative mt-2 h-32 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
        </div>
      </main>
    </div>
  );
}
