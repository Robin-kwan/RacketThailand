import Link from "next/link";
import { SPORT_META } from "@/data/sportMeta";
import { CourtRequestList } from "@/components/court-request-list";
import { BaseCard } from "@/components/base-card";
import { CourtCard as DashboardCourtCard } from "@/components/court-card";
import { GroupCard as DashboardGroupCard } from "@/components/group-card";
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
  sports: { code: string } | null;
  court_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

type OwnedGroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports?: { code: string } | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

function getSportFallbackImage(code?: string | null) {
  if (!code) return "/sports/badminton.svg";
  return SPORT_META[code]?.coverImage ?? "/sports/badminton.svg";
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
    return null;
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

  const [{ data: ownedCourtsData }, { data: ownedGroupsData }] = await Promise.all([
    supabaseSelect<OwnedCourtRow>("courts", {
      select: "id,name,district,province,sports!inner(code),court_photos(image_url,is_primary)",
      created_by: `eq.${user.id}`,
      order: "name.asc.nullslast",
    }),
    supabaseSelect<OwnedGroupRow>("groups", {
      select:
        "id,name,description,sports!inner(code),group_photos(image_url,is_primary)",
      owner_id: `eq.${user.id}`,
      order: "created_at.desc",
    }),
  ]);

  const ownedCourts = ownedCourtsData ?? [];
  const ownedGroups = ownedGroupsData ?? [];

  const dayLabels = {
    sunday: t("groups.days.sunday"),
    monday: t("groups.days.monday"),
    tuesday: t("groups.days.tuesday"),
    wednesday: t("groups.days.wednesday"),
    thursday: t("groups.days.thursday"),
    friday: t("groups.days.friday"),
    saturday: t("groups.days.saturday"),
  };
  const scheduleAnytime = t("groups.detail.scheduleAny");

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
    addCourtCta: t("dashboard.courtRequests.addCourtCta"),
    ownedCourtsTitle: t("dashboard.ownedCourts.title"),
    ownedCourtsEmpty: t("dashboard.ownedCourts.empty"),
    ownedGroupsTitle: t("dashboard.ownedGroups.title"),
    ownedGroupsEmpty: t("dashboard.ownedGroups.empty"),
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BaseCard as="article" className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {copy.ownedCourtsTitle}
            </h2>
            {canAddCourts && (
              <Link
                href={buildLocalizedPath("/dashboard/courts/new", locale)}
                className="text-xs font-semibold uppercase rt-text-muted hover:text-[var(--foreground)]"
              >
                {copy.addCourtCta}
              </Link>
            )}
          </div>
          {ownedCourts.length === 0 ? (
            <div className="mt-4 space-y-3 text-sm rt-text-muted">
              <p>{copy.ownedCourtsEmpty}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 text-xs text-[var(--foreground)]">
                <span aria-hidden>ℹ️</span>
                <span className="font-semibold">
                  Add a court by contacting racketthailand@gmail.com
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {ownedCourts.map((court) => (
                <DashboardCourtCard
                  key={court.id}
                  name={court.name ?? "Unnamed court"}
                  href={buildLocalizedPath(`/courts/${court.id}`, locale)}
                  imageUrl={
                    court.court_photos?.find((photo) => photo.is_primary)?.image_url ??
                    court.court_photos?.[0]?.image_url ??
                    getSportFallbackImage(court.sports?.code)
                  }
                  imageAlt={court.name ?? "Court image"}
                  location={[court.district, court.province].filter(Boolean).join(" · ")}
                  showDetails={false}
                  primaryBadge={court.province ?? undefined}
                />
              ))}
            </div>
          )}
        </BaseCard>

        <BaseCard as="article" className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {copy.ownedGroupsTitle}
            </h2>
            <Link
              href={buildLocalizedPath("/groups/create", locale)}
              className="text-xs font-semibold uppercase rt-text-muted hover:text-[var(--foreground)]"
            >
              {t("groups.form.submit")}
            </Link>
          </div>
          {ownedGroups.length === 0 ? (
            <p className="mt-4 text-sm rt-text-muted">
              {copy.ownedGroupsEmpty}
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {ownedGroups.map((group) => (
                <DashboardGroupCard
                  key={group.id}
                  name={group.name ?? "Community group"}
                  href={buildLocalizedPath(`/groups/${group.id}`, locale)}
                  imageUrl={
                    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
                    group.group_photos?.[0]?.image_url ??
                    getSportFallbackImage(group.sports?.code)
                  }
                  imageAlt={group.name ?? "Group photo"}
                  description={group.description}
                  dayLabels={dayLabels}
                  scheduleAnytime={scheduleAnytime}
                  locale={locale}
                  showSessions={false}
                  showLocation={false}
                  badge={
                    group.sports?.code ? (
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        {SPORT_META[group.sports.code]?.name[locale] ?? group.sports.code}
                      </span>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </BaseCard>
      </section>

      {ownedCourts.length > 0 && (
        <BaseCard
          as="section"
          className="rounded-[32px] border border-[var(--rt-primary-border)] p-8"
        >
          <p className="text-xs font-semibold uppercase rt-text-muted tracking-[0.3em]">
            Dashboard · Courts
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm rt-text-muted">{copy.subtitle}</p>
          <div className="mt-6">
            <CourtRequestList
              requests={requestCards}
              copy={copy}
              locale={locale}
            />
          </div>
        </BaseCard>
      )}
      </main>
    </div>
  );
}
