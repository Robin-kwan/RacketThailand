import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BaseCard } from "@/components/base-card";
import { CourtRequestList } from "@/components/court-request-list";
import { SPORT_META } from "@/data/sportMeta";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

type OwnedCourtRow = {
  id: string;
  name: string | null;
  district: string | null;
  province: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  sports: { code: string } | null;
  court_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

type OwnedGroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  updated_at: string | null;
  sports?: { code: string } | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

function getSportFallbackImage(code?: string | null) {
  if (!code) return "/sports/badminton.png";
  return SPORT_META[code]?.coverImage ?? "/sports/badminton.png";
}

function getPrimaryImage(
  photos:
    | { image_url: string | null; is_primary: boolean | null }[]
    | undefined,
  fallback: string,
) {
  return (
    photos?.find((photo) => photo.is_primary && photo.image_url)?.image_url ??
    photos?.find((photo) => photo.image_url)?.image_url ??
    fallback
  );
}

function formatDate(value: string | null, locale: "th" | "en") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildAuthPagePath("/login", locale, "/dashboard"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";
  const canAddCourts =
    profile?.status === "court_manager" || profile?.status === "admin";

  let requestQuery = supabase
    .from("court_groups")
    .select(
      "id,created_at,note,groups(id,name,description),courts!inner(id,name,province,created_by)",
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });
  if (!isAdmin) {
    requestQuery = requestQuery.eq("courts.created_by", user.id);
  }
  const { data: requests } = await requestQuery;
  const requestCards =
    requests?.map((request) => {
      const groupData = Array.isArray(request.groups)
        ? request.groups[0]
        : request.groups;
      const courtData = Array.isArray(request.courts)
        ? request.courts[0]
        : request.courts;
      return {
        id: request.id,
        created_at: request.created_at,
        note: request.note,
        groups: groupData
          ? {
              id: groupData.id,
              name: groupData.name,
              description: groupData.description,
            }
          : null,
        courts: courtData
          ? {
              id: courtData.id,
              name: courtData.name,
              province: courtData.province,
            }
          : null,
      };
    }) ?? [];

  const [{ data: ownedCourtsData }, { data: ownedGroupsData }] =
    await Promise.all([
      supabaseSelect<OwnedCourtRow>("courts", {
        select:
          "id,name,district,province,is_active,updated_at,sports!inner(code),court_photos(image_url,is_primary)",
        created_by: `eq.${user.id}`,
        order: "updated_at.desc.nullslast",
      }),
      supabaseSelect<OwnedGroupRow>("groups", {
        select:
          "id,name,description,status,updated_at,sports!inner(code),group_photos(image_url,is_primary)",
        owner_id: `eq.${user.id}`,
        order: "updated_at.desc.nullslast",
      }),
    ]);

  const ownedCourts = ownedCourtsData ?? [];
  const ownedGroups = ownedGroupsData ?? [];

  const copy = {
    title: t("dashboard.courtRequests.title"),
    subtitle: t("dashboard.courtRequests.subtitle"),
    empty: t("dashboard.courtRequests.empty"),
    verify: t("dashboard.courtRequests.verify"),
    reject: t("dashboard.courtRequests.reject"),
    verifying: t("dashboard.courtRequests.verifying"),
    rejecting: t("dashboard.courtRequests.rejecting"),
    rejectedNote: t("dashboard.courtRequests.rejectedNote"),
    badge: t("dashboard.courtRequests.badge"),
    submitted: t("dashboard.courtRequests.submitted"),
    ownedCourtsTitle: t("dashboard.ownedCourts.title"),
    ownedCourtsEmpty: t("dashboard.ownedCourts.empty"),
    ownedGroupsTitle: t("dashboard.ownedGroups.title"),
    ownedGroupsEmpty: t("dashboard.ownedGroups.empty"),
  };
  const ui = {
    title: t("dashboard.overview.title"),
    quickActions: t("dashboard.overview.quickActions"),
    quickActionsSubtitle: t("dashboard.overview.quickActionsSubtitle"),
    editProfile: t("dashboard.overview.editProfile"),
    view: t("dashboard.overview.view"),
    edit: t("dashboard.overview.edit"),
    updated: t("dashboard.overview.updated"),
    noSport: t("dashboard.overview.noSport"),
    noLocation: t("dashboard.overview.noLocation"),
    unnamedCourt: t("dashboard.overview.unnamedCourt"),
    courtImage: t("dashboard.overview.courtImage"),
    unnamedGroup: t("dashboard.overview.unnamedGroup"),
    groupImage: t("dashboard.overview.groupImage"),
    courtsCount: t("dashboard.overview.courtsCount"),
    groupsCount: t("dashboard.overview.groupsCount"),
    requestsCount: t("dashboard.overview.requestsCount"),
    addCourt: t("dashboard.overview.addCourt"),
    createGroup: t("dashboard.overview.createGroup"),
    active: t("dashboard.overview.active"),
    inactive: t("dashboard.overview.inactive"),
    published: t("dashboard.overview.published"),
    draft: t("dashboard.overview.draft"),
  };
  const numberLocale = locale === "th" ? "th-TH" : "en-US";
  const addCourtHref = buildLocalizedPath(
    canAddCourts ? "/dashboard/courts/new" : "/courts/new",
    locale,
  );
  const stats = [
    {
      label: ui.courtsCount,
      value: ownedCourts.length.toLocaleString(numberLocale),
    },
    {
      label: ui.groupsCount,
      value: ownedGroups.length.toLocaleString(numberLocale),
    },
    {
      label: ui.requestsCount,
      value: requestCards.length.toLocaleString(numberLocale),
    },
  ];

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        <BaseCard as="section" className="overflow-hidden p-0">
          <div className="bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {ui.title}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={addCourtHref}
                  className="rt-btn-court inline-flex items-center justify-center px-5 py-2 text-center text-sm"
                >
                  {ui.addCourt}
                </Link>
                <Link
                  href={buildLocalizedPath("/groups/create", locale)}
                  className="rt-btn-group inline-flex items-center justify-center px-5 py-2 text-sm"
                >
                  {ui.createGroup}
                </Link>
              </div>
            </div>
          </div>
          <div className="grid divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 py-4">
                <p className="text-2xl font-semibold text-slate-950">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </BaseCard>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <BaseCard as="article" className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  {copy.ownedCourtsTitle}
                </h2>
                <Link
                  href={addCourtHref}
                  className="rt-btn-court inline-flex items-center justify-center px-4 py-2 text-sm"
                >
                  {ui.addCourt}
                </Link>
              </div>

              {ownedCourts.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm rt-text-muted">
                  {copy.ownedCourtsEmpty}
                </p>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {ownedCourts.map((court) => {
                    const sportCode = court.sports?.code;
                    const sportLabel = sportCode
                      ? SPORT_META[sportCode]?.name[locale] ?? sportCode
                      : ui.noSport;
                    return (
                      <article
                        key={court.id}
                        className="flex gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          <Image
                            src={getPrimaryImage(
                              court.court_photos,
                              getSportFallbackImage(sportCode),
                            )}
                            alt={court.name ?? ui.courtImage}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-950">
                              {court.name ?? ui.unnamedCourt}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              {sportLabel}
                            </span>
                            <span
                              className={
                                court.is_active
                                  ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                                  : "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500"
                              }
                            >
                              {court.is_active ? ui.active : ui.inactive}
                            </span>
                          </div>
                          <p className="mt-1 text-xs rt-text-muted">
                            {[court.district, court.province]
                              .filter(Boolean)
                              .join(", ") || ui.noLocation}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {ui.updated}: {formatDate(court.updated_at, locale)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={buildLocalizedPath(
                                `/courts/${court.id}`,
                                locale,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              {ui.view}
                            </Link>
                            <Link
                              href={buildLocalizedPath(
                                `/courts/${court.id}/edit`,
                                locale,
                              )}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                            >
                              {ui.edit}
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </BaseCard>

            {ownedCourts.length > 0 && (
              <BaseCard as="section" className="p-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm rt-text-muted">{copy.subtitle}</p>
                <div className="mt-5">
                  <CourtRequestList
                    requests={requestCards}
                    copy={copy}
                    locale={locale}
                  />
                </div>
              </BaseCard>
            )}
          </div>

          <aside className="space-y-6">
            <BaseCard as="section" className="p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {ui.quickActions}
              </h2>
              <p className="mt-2 text-sm rt-text-muted">
                {ui.quickActionsSubtitle}
              </p>
              <div className="mt-5 grid gap-3">
                <Link
                  href={addCourtHref}
                  className="rt-btn-court inline-flex items-center justify-center px-5 py-2 text-center text-sm"
                >
                  {ui.addCourt}
                </Link>
                <Link
                  href={buildLocalizedPath("/groups/create", locale)}
                  className="rt-btn-group inline-flex items-center justify-center px-5 py-2 text-center text-sm"
                >
                  {ui.createGroup}
                </Link>
                <Link
                  href={buildLocalizedPath("/profile/edit", locale)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-center text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {ui.editProfile}
                </Link>
              </div>
            </BaseCard>

            <BaseCard as="article" className="p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {copy.ownedGroupsTitle}
              </h2>
              {ownedGroups.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm rt-text-muted">
                  {copy.ownedGroupsEmpty}
                </p>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {ownedGroups.map((group) => {
                    const sportCode = group.sports?.code;
                    const sportLabel = sportCode
                      ? SPORT_META[sportCode]?.name[locale] ?? sportCode
                      : ui.noSport;
                    const isPublished = group.status === "published";
                    return (
                      <article
                        key={group.id}
                        className="flex gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          <Image
                            src={getPrimaryImage(
                              group.group_photos,
                              getSportFallbackImage(sportCode),
                            )}
                            alt={group.name ?? ui.groupImage}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {group.name ?? ui.unnamedGroup}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              {sportLabel}
                            </span>
                            <span
                              className={
                                isPublished
                                  ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                                  : "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500"
                              }
                            >
                              {isPublished ? ui.published : ui.draft}
                            </span>
                          </div>
                          {group.description && (
                            <p className="mt-2 line-clamp-2 text-xs rt-text-muted">
                              {group.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            {ui.updated}: {formatDate(group.updated_at, locale)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={buildLocalizedPath(
                                `/groups/${group.id}`,
                                locale,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              {ui.view}
                            </Link>
                            <Link
                              href={buildLocalizedPath(
                                `/groups/${group.id}/edit`,
                                locale,
                              )}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                            >
                              {ui.edit}
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </BaseCard>
          </aside>
        </section>
      </main>
    </div>
  );
}
