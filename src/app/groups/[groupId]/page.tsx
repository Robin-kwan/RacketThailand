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
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { ensureGroupLineQrUrl } from "@/server/lineQr";
import { ViewTracker } from "@/components/view-tracker";
import { incrementViewCount } from "@/lib/viewCounts";
import { BaseCard } from "@/components/base-card";
import { BaseScheduleList } from "@/components/base-schedule-list";

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
  player_amount: number | null;
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
  } | null;
};

type GroupMetadataRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports: { code: string; name: string | null } | null;
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
      "id,name,description,sports(code,name),group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,courts(name,district,province))",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = data?.[0];
  if (!group) {
    return {
      title: "Group not found | RacketThailand",
    };
  }
  const sportMeta = group.sports?.code
    ? SPORT_META[group.sports.code]
    : undefined;
  const sportName =
    sportMeta?.name?.[locale] ??
    group.sports?.name ??
    (locale === "th" ? "กลุ่มกีฬา" : "Sport group");
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
    location ? `Location: ${location}` : null,
    group.group_sessions?.length
      ? `Sessions per week: ${group.group_sessions.length}`
      : null,
  ].filter(Boolean);
  const description =
    descriptionParts.join(" · ") ||
    `${sportName} community listed on RacketThailand.`;
  const canonicalPath = `/groups/${resolvedParams.groupId}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const heroImage =
    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
    group.group_photos?.[0]?.image_url ??
    sportMeta?.coverImage ??
    undefined;

  return {
    title: `${group.name ?? sportName}${
      location ? ` in ${location}` : ""
    } | ${sportName} | RacketThailand`,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: `${group.name ?? sportName}${
        location ? ` in ${location}` : ""
      } | RacketThailand`,
      description,
      url: canonical,
      type: "website",
      images: heroImage
        ? [
            {
              url: heroImage,
              alt: `${group.name ?? sportName} group photo`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${group.name ?? sportName} | RacketThailand`,
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

  let viewerStatus: string | null = null;
  if (sessionUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", sessionUser.id)
      .single();
    viewerStatus = profile?.status ?? null;
  }

  const { data: groups } = await supabaseSelect<GroupRow>("groups", {
    select:
      "id,name,description,owner_id,sports(code,name),updated_at,player_amount,phone,line_id,line_qr_url",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = groups?.[0];
  if (!group) {
    notFound();
  }

  const isAdminViewer = viewerStatus === "admin";
  const isGroupOwner =
    sessionUser?.id && group.owner_id
      ? sessionUser.id === group.owner_id
      : false;

  if (!isAdminViewer && !isGroupOwner) {
    try {
      await incrementViewCount("group", group.id);
    } catch (error) {
      console.error("Failed to increment group view count", error);
    }
  }

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
          "id,court_id,day,start_time,end_time,courts(id,name,district,province)",
        group_id: `eq.${group.id}`,
        order: "day.asc,start_time.asc",
      }),
    ]);

  const owner = owners?.[0] ?? null;
  const sportCode = group.sports?.code;
  const fallbackImage =
    SPORT_META[sportCode ?? ""]?.coverImage ?? "/sports/badminton.svg";
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

  const sessionGroups = (() => {
    const map = new Map<
      string,
      {
        court: GroupSessionRow["courts"];
        sessions: GroupSessionRow[];
      }
    >();
    (sessionRows ?? []).forEach((session) => {
      const existing = map.get(session.court_id);
      if (existing) {
        existing.sessions.push(session);
      } else {
        map.set(session.court_id, {
          court: session.courts,
          sessions: [session],
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
    name: displayGroup.name ?? "Community group",
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
    updated: t("groups.detail.updated"),
    sessionsTitle: t("groups.detail.sessionsTitle"),
    sessionsEmpty: t("groups.detail.sessionsEmpty"),
    playerAmount: t("groups.detail.playerAmount"),
    phone: t("groups.detail.phone"),
    line: t("groups.detail.line"),
    lineQr: t("groups.detail.lineQr"),
  };
  const canEdit = isGroupOwner;
  const sportName = group.sports?.name ?? undefined;

  return (
    <div className="rt-page">
      <ViewTracker
        event="group_view"
        payload={{ groupId: group.id }}
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 text-[var(--foreground)] md:px-10">
        <HeaderSportScope sportSlug={sportCode ?? undefined} />
        <HeaderSubLabel value={sportName} />
        <CourtGallery gallery={gallery} courtName={group.name} />
        <BaseCard
          as="section"
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            Group · {group.sports?.name ?? "RacketThailand"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="mt-3 text-4xl font-semibold text-[var(--foreground)]">
              {group.name}
            </h1>
            {canEdit && (
              <Link
                href={buildLocalizedPath(`/groups/${group.id}/edit`, locale)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                {copy.edit}
              </Link>
            )}
          </div>
          {group.description && (
            <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
              {group.description}
            </p>
          )}
          <div className="mt-6 grid gap-5 rounded-3xl border border-slate-100 bg-[rgb(var(--foreground-rgb)/0.02)] px-6 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.owner}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {owner?.display_name ?? owner?.username ?? "—"}
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
            {group.phone && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.phone}
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  <a
                    href={`tel:${group.phone}`}
                    className="underline decoration-dotted"
                  >
                    {group.phone}
                  </a>
                </p>
              </div>
            )}
            {displayGroup.line_id && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.line}
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {displayGroup.line_id}
                </p>
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
            {displayGroup.updated_at && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.updated}
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {new Date(displayGroup.updated_at).toLocaleDateString(
                    locale === "th" ? "th-TH" : "en-US",
                    { dateStyle: "long" },
                  )}
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.sessionsTitle}
              </p>
              {sessionGroups.length === 0 ? (
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {copy.sessionsEmpty}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {sessionGroups.map((entry, index) => (
                    <BaseCard
                      key={entry.court?.id ?? `session-${index}`}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      {entry.court ? (
                        <Link
                          href={buildLocalizedPath(
                            `/courts/${entry.court.id}`,
                            locale,
                          )}
                          className="text-sm font-semibold text-[var(--rt-primary)] underline-offset-2 hover:underline"
                        >
                          {entry.court.name ?? "Linked court"}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--foreground)]">
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
                                ? formatTimeRange(
                                    session.start_time,
                                    session.end_time,
                                    locale,
                                  )
                                : copy.scheduleAny,
                          }))}
                          className="mt-2"
                        />
                      ) : (
                        <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
                          {copy.scheduleAny}
                        </p>
                      )}
                    </BaseCard>
                  ))}
                </div>
              )}
            </div>
          </div>
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
