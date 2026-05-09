import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import {
  CasualPlayJoinRequestForm,
  type JoinRequestStatus,
} from "@/components/casual-plays/casual-play-join-request-form";
import {
  CasualPlayJoinRequestsManager,
  type CasualPlayJoinRequestRow,
} from "@/components/casual-plays/casual-play-join-requests-manager";
import { ContactActionValue } from "@/components/contact-action-value";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { ShareButton } from "@/components/share-button";
import { ViewTracker } from "@/components/view-tracker";
import { SPORT_META } from "@/data/sportMeta";
import {
  formatCasualPlayDate,
  formatCasualPlayTimeRange,
  isCasualPlayExpired,
} from "@/lib/casual-play";
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

type Params = {
  playId: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Promise<Params>;
type SearchParamsInput = Promise<SearchParams> | undefined;

type CasualPlayRow = {
  id: string;
  title: string | null;
  description: string | null;
  owner_id: string | null;
  updated_at: string | null;
  play_date: string;
  start_time: string | null;
  end_time: string | null;
  player_amount: number | null;
  phone: string | null;
  line_id: string | null;
  allow_public_contact: boolean | null;
  court_id: string | null;
  venue_name: string | null;
  location_note: string | null;
  sports: { code: string; name: string | null } | null;
  courts: {
    id: string;
    name: string | null;
    district: string | null;
    province: string | null;
  } | null;
};

type OwnerProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type JoinRequestRecord = {
  id: string;
  requester_id: string;
  contact_name: string | null;
  phone: string | null;
  line_id: string | null;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
};

type AcceptedJoinRequestRecord = {
  id: string;
};

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
  const { data } = await supabaseSelect<CasualPlayRow>("casual_plays", {
    select:
      "id,title,description,play_date,start_time,end_time,venue_name,location_note,sports(code,name),courts(name,district,province)",
    id: `eq.${resolvedParams.playId}`,
    limit: "1",
  });
  const play = data?.[0];

  if (!play || isCasualPlayExpired(play.play_date)) {
    return {
      title:
        locale === "th"
          ? "ไม่พบข้อมูลหาเพื่อนตี | RacketThailand"
          : "Casual play not found | RacketThailand",
    };
  }

  const sportMeta = play.sports?.code ? SPORT_META[play.sports.code] : undefined;
  const sportName =
    sportMeta?.name?.[locale] ??
    play.sports?.name ??
    (locale === "th" ? "กีฬาแร็กเกต" : "Racket sport");
  const venueName = play.courts?.name ?? play.venue_name ?? null;
  const description = truncateMetaDescription(
    [
      play.description,
      formatCasualPlayDate(play.play_date, locale),
      venueName,
      play.location_note,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const canonicalPath = `/casual-plays/${resolvedParams.playId}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);

  return {
    title: `${play.title ?? sportName} | RacketThailand`,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: `${play.title ?? sportName} | RacketThailand`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${play.title ?? sportName} | RacketThailand`,
      description,
    },
  };
}

export default async function CasualPlayDetailPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(resolvedParams.playId)) {
    notFound();
  }

  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const { data: plays } = await supabaseSelect<CasualPlayRow>("casual_plays", {
    select:
      "id,title,description,owner_id,updated_at,play_date,start_time,end_time,player_amount,phone,line_id,allow_public_contact,court_id,venue_name,location_note,sports(code,name),courts(id,name,district,province)",
    id: `eq.${resolvedParams.playId}`,
    limit: "1",
  });
  const play = plays?.[0];

  if (!play || isCasualPlayExpired(play.play_date)) {
    notFound();
  }

  const isOwner =
    sessionUser?.id && play.owner_id
      ? sessionUser.id === play.owner_id
      : false;
  const { data: viewerProfile } = sessionUser
    ? await supabase
        .from("profiles")
        .select("status")
        .eq("id", sessionUser.id)
        .single()
    : { data: null };
  const isAdminViewer = viewerProfile?.status === "admin";
  const canEdit = Boolean(isOwner || isAdminViewer);
  const allowPublicContact = play.allow_public_contact === true;
  const maxPlayers =
    typeof play.player_amount === "number" &&
    Number.isFinite(play.player_amount) &&
    play.player_amount > 0
      ? play.player_amount
      : null;

  const [
    { data: owners },
    currentJoinRequestResult,
    ownerJoinRequestsResult,
    acceptedJoinRequestsResult,
  ] = await Promise.all([
    play.owner_id
      ? supabaseSelect<OwnerProfile>("profiles", {
          select: "id,display_name,username",
          id: `eq.${play.owner_id}`,
          limit: "1",
        })
      : Promise.resolve({ data: [] as OwnerProfile[] }),
    sessionUser?.id && !isOwner && !allowPublicContact
      ? supabaseSelect<JoinRequestRecord>("casual_play_join_requests", {
          select: "id,requester_id,contact_name,phone,line_id,message,status,created_at",
          play_id: `eq.${play.id}`,
          requester_id: `eq.${sessionUser.id}`,
          limit: "1",
        }).catch(() => ({ data: [] as JoinRequestRecord[] }))
      : Promise.resolve({ data: [] as JoinRequestRecord[] }),
    isOwner
      ? supabaseSelect<JoinRequestRecord>("casual_play_join_requests", {
          select: "id,requester_id,contact_name,phone,line_id,message,status,created_at",
          play_id: `eq.${play.id}`,
          order: "created_at.desc",
        }).catch(() => ({ data: [] as JoinRequestRecord[] }))
      : Promise.resolve({ data: [] as JoinRequestRecord[] }),
    maxPlayers !== null && !isOwner
      ? supabaseSelect<AcceptedJoinRequestRecord>("casual_play_join_requests", {
          select: "id",
          play_id: `eq.${play.id}`,
          status: "eq.accepted",
        }).catch(() => ({ data: [] as AcceptedJoinRequestRecord[] }))
      : Promise.resolve({ data: [] as AcceptedJoinRequestRecord[] }),
  ]);

  const owner = owners?.[0] ?? null;
  const currentJoinRequest = currentJoinRequestResult.data?.[0] ?? null;
  const ownerJoinRequests = ownerJoinRequestsResult.data ?? [];
  const acceptedCount =
    maxPlayers === null
      ? 0
      : isOwner
        ? ownerJoinRequests.filter((request) => request.status === "accepted")
            .length
        : (acceptedJoinRequestsResult.data?.length ?? 0);
  const isFull = maxPlayers !== null && acceptedCount >= maxPlayers;
  const requesterIds = Array.from(
    new Set(ownerJoinRequests.map((request) => request.requester_id)),
  );
  const requesterProfiles =
    requesterIds.length > 0
      ? await supabaseSelect<OwnerProfile>("profiles", {
          select: "id,display_name,username",
          id: `in.(${requesterIds.join(",")})`,
        }).catch(() => ({ data: [] as OwnerProfile[] }))
      : { data: [] as OwnerProfile[] };
  const requesterNameById = new Map(
    requesterProfiles.data.map((profile) => [
      profile.id,
      profile.display_name ?? profile.username ?? profile.id.slice(0, 6),
    ]),
  );
  const ownerRequestRows: CasualPlayJoinRequestRow[] = ownerJoinRequests.map(
    (request) => ({
      id: request.id,
      requesterName:
        requesterNameById.get(request.requester_id) ??
        request.requester_id.slice(0, 6),
      contactName: request.contact_name,
      phone: request.phone,
      lineId: request.line_id,
      message: request.message,
      status: request.status,
      createdAt: request.created_at,
    }),
  );
  const canViewOwnerContact =
    allowPublicContact || isOwner || currentJoinRequest?.status === "accepted";
  const sportCode = play.sports?.code;
  const sportName = play.sports?.name ?? undefined;
  const venueName = play.courts?.name ?? play.venue_name;
  const canonicalPath = `/casual-plays/${play.id}`;
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);
  const fallbackTitle =
    locale === "th" ? "หาเพื่อนตี" : "Casual play";
  const shareTitle = play.title ?? fallbackTitle;
  const shareText = [
    formatCasualPlayDate(play.play_date, locale),
    formatCasualPlayTimeRange(play.start_time, play.end_time, locale),
    venueName,
  ]
    .filter(Boolean)
    .join(" · ");
  const startTimeValue = play.start_time?.slice(0, 5) ?? "00:00";
  const endTimeValue = play.end_time?.slice(0, 5) ?? "00:00";
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": canonicalUrl,
    name: play.title ?? (locale === "th" ? "หาเพื่อนตี" : "Casual play"),
    description: play.description ?? undefined,
    startDate: `${play.play_date}T${startTimeValue}:00+07:00`,
    endDate: play.end_time
      ? `${play.play_date}T${endTimeValue}:00+07:00`
      : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    sport:
      sportCode && SPORT_META[sportCode]
        ? SPORT_META[sportCode]?.name?.[locale] ?? SPORT_META[sportCode]?.name?.en
        : undefined,
    organizer: owner
      ? {
          "@type": "Person",
          name: owner.display_name ?? owner.username ?? undefined,
        }
      : undefined,
    location: venueName
      ? {
          "@type": "Place",
          name: venueName,
          address:
            play.courts?.district || play.courts?.province || play.location_note
              ? {
                  "@type": "PostalAddress",
                  streetAddress: play.location_note ?? undefined,
                  addressLocality: play.courts?.district ?? undefined,
                  addressRegion: play.courts?.province ?? undefined,
                }
              : undefined,
        }
      : undefined,
  };
  const copy = {
    owner: t("casualPlays.detail.owner"),
    date: t("casualPlays.detail.date"),
    time: t("casualPlays.detail.time"),
    venue: t("casualPlays.detail.venue"),
    locationNote: t("casualPlays.detail.locationNote"),
    playerAmount: t("casualPlays.detail.playerAmount"),
    full: t("casualPlays.detail.full"),
    phone: t("casualPlays.detail.phone"),
    line: t("casualPlays.detail.line"),
    edit: t("casualPlays.detail.edit"),
    back: t("casualPlays.detail.back"),
    copyAction: t("contactActions.copy"),
    copiedAction: t("contactActions.copied"),
    callAction: t("contactActions.call"),
    shareAction: t("contactActions.share"),
    linkCopiedAction: t("contactActions.linkCopied"),
    ownerContactTitle: t("casualPlays.detail.ownerContactTitle"),
    ownerContactHelp: t("casualPlays.detail.ownerContactHelp"),
    ownerContactPublicHelp: t("casualPlays.detail.ownerContactPublicHelp"),
    ownerContactLocked: t("casualPlays.detail.ownerContactLocked"),
  };
  const joinRequestCopy = {
    title: t("casualPlays.detail.joinRequest.title"),
    subtitle: t("casualPlays.detail.joinRequest.subtitle"),
    loginPrompt: t("casualPlays.detail.joinRequest.loginPrompt"),
    loginCta: t("casualPlays.detail.joinRequest.loginCta"),
    contactName: t("casualPlays.detail.joinRequest.contactName"),
    phone: t("casualPlays.detail.joinRequest.phone"),
    line: t("casualPlays.detail.joinRequest.line"),
    message: t("casualPlays.detail.joinRequest.message"),
    submit: t("casualPlays.detail.joinRequest.submit"),
    submitting: t("casualPlays.detail.joinRequest.submitting"),
    success: t("casualPlays.detail.joinRequest.success"),
    error: t("casualPlays.detail.joinRequest.error"),
    contactRequired: t("casualPlays.detail.joinRequest.contactRequired"),
    statusPending: t("casualPlays.detail.joinRequest.statusPending"),
    statusAccepted: t("casualPlays.detail.joinRequest.statusAccepted"),
    statusRejected: t("casualPlays.detail.joinRequest.statusRejected"),
    full: t("casualPlays.detail.joinRequest.full"),
    sendAgain: t("casualPlays.detail.joinRequest.sendAgain"),
  };
  const ownerRequestsCopy = {
    title: t("casualPlays.detail.ownerRequests.title"),
    subtitle: t("casualPlays.detail.ownerRequests.subtitle"),
    empty: t("casualPlays.detail.ownerRequests.empty"),
    requester: t("casualPlays.detail.ownerRequests.requester"),
    contact: t("casualPlays.detail.ownerRequests.contact"),
    message: t("casualPlays.detail.ownerRequests.message"),
    submitted: t("casualPlays.detail.ownerRequests.submitted"),
    accept: t("casualPlays.detail.ownerRequests.accept"),
    reject: t("casualPlays.detail.ownerRequests.reject"),
    accepting: t("casualPlays.detail.ownerRequests.accepting"),
    rejecting: t("casualPlays.detail.ownerRequests.rejecting"),
    statusPending: t("casualPlays.detail.ownerRequests.statusPending"),
    statusAccepted: t("casualPlays.detail.ownerRequests.statusAccepted"),
    statusRejected: t("casualPlays.detail.ownerRequests.statusRejected"),
    full: t("casualPlays.detail.ownerRequests.full"),
    error: t("casualPlays.detail.ownerRequests.error"),
  };
  const backHref = buildLocalizedPath(
    sportCode ? `/${sportCode}/casual-plays` : "/",
    locale,
  );
  const loginHref = buildLocalizedPath("/login", locale);

  return (
    <div className="rt-page">
      <ViewTracker event="casual_play_view" payload={{ playId: play.id }} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 text-[var(--foreground)] md:px-10">
        <HeaderSportScope sportSlug={sportCode ?? undefined} />
        <HeaderSubLabel value={sportName} />
        <BaseBackLink href={backHref}>{copy.back}</BaseBackLink>
        <BaseCard
          as="section"
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            {locale === "th" ? "หาเพื่อนตี" : "Casual play"} ·{" "}
            {play.sports?.name ?? "RacketThailand"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-[var(--foreground)]">
              {shareTitle}
            </h1>
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
                  href={buildLocalizedPath(`/casual-plays/${play.id}/edit`, locale)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  {copy.edit}
                </Link>
              )}
            </div>
          </div>
          {play.description && (
            <p className="whitespace-pre-line text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
              {play.description}
            </p>
          )}
          <div className="grid gap-5 rounded-3xl border border-slate-100 bg-[rgb(var(--foreground-rgb)/0.02)] px-6 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.owner}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {owner?.display_name ?? owner?.username ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.date}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {formatCasualPlayDate(play.play_date, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.time}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {formatCasualPlayTimeRange(play.start_time, play.end_time, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                {copy.venue}
              </p>
              {play.courts?.id ? (
                <Link
                  href={buildLocalizedPath(`/courts/${play.courts.id}`, locale)}
                  className="text-base font-semibold text-blue-600 underline-offset-2 hover:underline"
                >
                  {venueName ?? "—"}
                </Link>
              ) : (
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {venueName ?? "—"}
                </p>
              )}
              {(play.courts?.district || play.courts?.province) && (
                <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
                  {[play.courts?.district, play.courts?.province]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            {play.location_note && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.locationNote}
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {play.location_note}
                </p>
              </div>
            )}
            {maxPlayers !== null && (
              <div>
                <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                  {copy.playerAmount}
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {acceptedCount}/{maxPlayers}
                  {isFull && (
                    <span className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      {copy.full}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {(play.phone || play.line_id) && (
            <div className="rounded-3xl border border-slate-100 bg-white px-6 py-5">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {copy.ownerContactTitle}
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
                {allowPublicContact
                  ? copy.ownerContactPublicHelp
                  : copy.ownerContactHelp}
              </p>
              {canViewOwnerContact ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {play.phone && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                        {copy.phone}
                      </p>
                      <ContactActionValue
                        mode="phone"
                        value={play.phone}
                        copyLabel={copy.copyAction}
                        copiedLabel={copy.copiedAction}
                        callLabel={copy.callAction}
                      />
                    </div>
                  )}
                  {play.line_id && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                        {copy.line}
                      </p>
                      <ContactActionValue
                        mode="line"
                        value={play.line_id}
                        copyLabel={copy.copyAction}
                        copiedLabel={copy.copiedAction}
                        callLabel={copy.callAction}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {copy.ownerContactLocked}
                </p>
              )}
            </div>
          )}
        </BaseCard>
        {isOwner ? (
          <CasualPlayJoinRequestsManager
            playId={play.id}
            requests={ownerRequestRows}
            maxPlayers={maxPlayers}
            copy={ownerRequestsCopy}
            locale={locale}
          />
        ) : allowPublicContact ? null : (
          <CasualPlayJoinRequestForm
            playId={play.id}
            isAuthenticated={Boolean(sessionUser?.id)}
            loginHref={loginHref}
            initialStatus={currentJoinRequest?.status ?? null}
            isFull={isFull}
            copy={joinRequestCopy}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventStructuredData),
          }}
        />
      </main>
    </div>
  );
}
