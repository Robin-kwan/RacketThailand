import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import {
  AdminResourceTable,
  type AdminResourceRow,
} from "@/components/admin/admin-resource-table";
import { CourtAdminForm } from "@/components/admin/court-form";
import { CourtSubmissionRequests } from "@/components/admin/court-submission-requests";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { requireAdminPageAccess } from "@/server/admin";

type SearchParams = {
  lang?: string;
};
type SearchParamsInput = Promise<SearchParams> | undefined;

type CourtManagementRow = {
  id: string;
  sport_id: string | null;
  name: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  created_by: string | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  sports?: {
    code: string | null;
    name: string | null;
  } | null;
  court_photos?: { id: string }[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

function formatDate(value: string | null, locale: "th" | "en") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "th" ? "th-TH" : "en-US");
}

function buildContact(
  row: Pick<CourtManagementRow, "phone" | "line_id" | "website_url">,
) {
  return [
    row.phone ? `Phone: ${row.phone}` : null,
    row.line_id ? `LINE: ${row.line_id}` : null,
    row.website_url ? "Website" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  await requireAdminPageAccess(locale);
  const navItems = buildAdminPortalNav(locale, t);

  const [sportsRes, pendingCourtsRes, courtsRes, profilesRes] =
    await Promise.all([
      supabaseSelect<{
        id: string;
        code: string;
        name: string;
      }>("sports", {
        select: "id,code,name",
        order: "code.asc",
      }),
      supabaseSelect<{
        id: string;
        name: string | null;
        address: string | null;
        district: string | null;
        province: string | null;
        created_at: string;
      }>("courts", {
        select: "id,name,address,district,province,created_at",
        is_active: "eq.false",
        order: "created_at.desc",
        limit: "50",
      }),
      supabaseSelect<CourtManagementRow>("courts", {
        select:
          "id,sport_id,name,address,district,province,created_by,phone,line_id,website_url,is_active,updated_at,sports(code,name),court_photos(id)",
        order: "updated_at.desc.nullslast",
        limit: "100",
      }),
      supabaseSelect<ProfileRow>("profiles", {
        select: "id,display_name,username",
        order: "display_name.asc.nullslast",
        limit: "1000",
      }),
    ]);

  const sports = sportsRes.data;
  const pendingCourts = pendingCourtsRes.data;
  const courts = courtsRes.data;
  const profiles = profilesRes.data;

  const copy = {
    selectSport: t("admin.selectSport"),
    name: t("admin.courtName"),
    address: t("admin.address"),
    district: t("admin.district"),
    province: t("admin.province"),
    price: t("admin.price"),
    openingHours: t("admin.openingHours"),
    phone: t("admin.phone"),
    line: t("admin.line"),
    lineQr: t("admin.lineQr"),
    website: t("admin.website"),
    placeSearch: t("admin.placeSearch"),
    placeSearchHelper: t("admin.placeSearchHelper"),
    placeSearchNoResults: t("admin.placeSearchNoResults"),
    photos: t("admin.photos"),
    submit: t("admin.submit"),
    submitting: t("admin.submitting"),
    success: t("admin.success"),
    successPending: t("admin.success"),
    error: t("admin.error"),
    locationMissing: t("admin.locationMissing"),
  };

  const sportOptions =
    sports?.map((sport) => ({
      id: sport.id,
      label: sport.name ?? sport.code,
    })) ?? [];

  const profileNameById = new Map(
    profiles?.map((profile) => [
      profile.id,
      profile.display_name ?? profile.username ?? profile.id.slice(0, 6),
    ]) ?? [],
  );

  const tableRows: AdminResourceRow[] =
    courts?.map((court) => {
      const location =
        [court.district, court.province].filter(Boolean).join(" · ") ||
        t("admin.management.common.notSet");
      const contact = buildContact(court);
      const photoCount = court.court_photos?.length ?? 0;
      return {
        id: court.id,
        title: court.name?.trim() || t("admin.sections.courtFallback"),
        subtitle: court.address ?? location,
        meta: [court.sports?.name ?? court.sports?.code ?? "Sport"],
        details: [
          {
            label: t("admin.management.common.location"),
            value: location,
          },
          {
            label: t("admin.management.common.manager"),
            value: court.created_by
              ? profileNameById.get(court.created_by) ??
                court.created_by.slice(0, 6)
              : t("admin.management.common.unassigned"),
          },
          {
            label: t("admin.management.common.photos"),
            value: photoCount.toLocaleString(
              locale === "th" ? "th-TH" : "en-US",
            ),
          },
          {
            label: t("admin.management.common.contact"),
            value: contact || t("admin.management.common.notSet"),
          },
          {
            label: t("admin.management.common.updated"),
            value: formatDate(court.updated_at, locale),
          },
        ],
        statusLabel: court.is_active
          ? t("admin.management.courts.statusLive")
          : t("admin.management.courts.statusPending"),
        statusTone: court.is_active ? "green" : "yellow",
        viewHref: buildLocalizedPath(`/courts/${court.id}`, locale),
        editHref: buildLocalizedPath(`/courts/${court.id}/edit`, locale),
        deleteEndpoint: `/api/admin/courts/${court.id}`,
      };
    }) ?? [];

  const requestCopy = {
    title: t("admin.courtRequests.title"),
    empty: t("admin.courtRequests.empty"),
    submitted: t("admin.courtRequests.submitted"),
    view: t("admin.courtRequests.view"),
    publish: t("admin.courtRequests.publish"),
    reject: t("admin.courtRequests.reject"),
    publishing: t("admin.courtRequests.publishing"),
    rejecting: t("admin.courtRequests.rejecting"),
    error: t("admin.courtRequests.error"),
  };

  return (
    <AdminPortalShell
      activePath="/admin/courts"
      title={t("admin.management.courts.title")}
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {t("admin.management.courts.listTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("admin.management.courts.listSubtitle")}
          </p>
        </div>
        <AdminResourceTable
          rows={tableRows}
          copy={{
            searchLabel: t("admin.management.table.search"),
            searchPlaceholder: t("admin.management.courts.searchPlaceholder"),
            resultsLabel: t("admin.management.courts.resultsLabel"),
            headers: {
              item: t("admin.management.table.item"),
              details: t("admin.management.table.details"),
              status: t("admin.management.table.status"),
              actions: t("admin.management.table.actions"),
            },
            view: t("admin.management.table.view"),
            edit: t("admin.management.table.edit"),
            delete: t("admin.management.table.delete"),
            deleting: t("admin.management.table.deleting"),
            confirmDelete: t("admin.management.courts.confirmDelete"),
            deleted: t("admin.management.courts.deleted"),
            empty: t("admin.management.courts.empty"),
            error: t("admin.management.courts.error"),
            noDetails: t("admin.management.table.noDetails"),
          }}
        />
      </section>

      <CourtSubmissionRequests
        locale={locale}
        requests={pendingCourts ?? []}
        copy={requestCopy}
      />

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {t("admin.courtTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("admin.courtSubtitle")}
          </p>
        </div>
        <CourtAdminForm sports={sportOptions} copy={copy} />
      </section>
    </AdminPortalShell>
  );
}
