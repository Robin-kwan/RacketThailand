import { CourtOwnersTable } from "@/components/admin/court-owners-table";
import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import { getTranslator, normalizeLocale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { requireAdminPageAccess } from "@/server/admin";

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

export default async function CourtOwnersPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  await requireAdminPageAccess(locale);
  const navItems = buildAdminPortalNav(locale, t);

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string | null;
  }>("sports", {
    select: "id,code,name",
    order: "name.asc.nullslast",
  });

  const { data: courts } = await supabaseSelect<{
    id: string;
    sport_id: string;
    name: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    created_by: string | null;
    price_note: string | null;
    phone: string | null;
    line_id: string | null;
    website_url: string | null;
    latitude: string | null;
    longitude: string | null;
    google_place_id: string | null;
    sports?: {
      code: string | null;
      name: string | null;
    } | null;
    manager?: {
      display_name: string | null;
      username: string | null;
    } | null;
  }>("courts", {
    select:
      "id,sport_id,name,address,district,province,created_by,price_note,phone,line_id,website_url,latitude:lat,longitude:lng,google_place_id,sports(code,name),manager:profiles!courts_created_by_fkey(display_name,username)",
    order: "name.asc.nullslast",
  });

  const { data: profiles } = await supabaseSelect<{
    id: string;
    display_name: string | null;
    username: string | null;
    email: string | null;
  }>("profiles", {
    select: "id,display_name,username",
    order: "display_name.asc.nullslast",
  });

  const profileOptions =
    profiles?.map((owner) => ({
      value: owner.id,
      label: owner.display_name ?? owner.username ?? owner.id.slice(0, 6),
    })) ?? [];

  const copy = {
    title: t("admin.courtOwnersTitle"),
    sportFilter: t("admin.courtOwnersTable.sportFilter"),
    allSports: t("admin.courtOwnersTable.allSports"),
    courtFilter: t("admin.courtOwnersTable.courtFilter"),
    courtPlaceholder: t("admin.courtOwnersTable.courtPlaceholder"),
    managerFilter: t("admin.courtOwnersTable.managerFilter"),
    managerPlaceholder: t("admin.courtOwnersTable.managerPlaceholder"),
    locationFilter: t("admin.courtOwnersTable.locationFilter"),
    locationPlaceholder: t("admin.courtOwnersTable.locationPlaceholder"),
    sportColumn: t("admin.courtOwnersTable.sportColumn"),
    courtColumn: t("admin.courtOwnersTable.courtColumn"),
    managerColumn: t("admin.courtOwnersTable.managerColumn"),
    locationColumn: t("admin.courtOwnersTable.locationColumn"),
    assignColumn: t("admin.courtOwnersTable.assignColumn"),
    actionsColumn: t("admin.courtOwnersTable.actionsColumn"),
    resultsLabel: t("admin.courtOwnersTable.resultsLabel"),
    unassigned: t("admin.courtOwnersTable.unassigned"),
    save: t("admin.courtOwnersTable.save"),
    saving: t("admin.courtOwnersTable.saving"),
    noResults: t("admin.courtOwnersTable.noResults"),
    success: t("admin.assignSuccess"),
    error: t("admin.assignError"),
  };
  const rows =
    courts?.map((court) => ({
      id: court.id,
      sportId: court.sport_id,
      name: court.name,
      address: court.address,
      district: court.district,
      province: court.province,
      sportCode: court.sports?.code ?? null,
      sportName: court.sports?.name ?? null,
      managerId: court.created_by,
      managerName:
        court.manager?.display_name ?? court.manager?.username ?? null,
      price_note: court.price_note,
      phone: court.phone,
      line_id: court.line_id,
      website_url: court.website_url,
      latitude: court.latitude,
      longitude: court.longitude,
      googlePlaceId: court.google_place_id,
    })) ?? [];

  return (
    <AdminPortalShell
      activePath="/admin/court-owners"
      title={copy.title}
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <CourtOwnersTable
          rows={rows}
          profiles={profileOptions}
          sports={
            sports?.map((sport) => ({
              id: sport.id,
              label: sport.name ?? sport.code,
            })) ?? []
          }
          copy={{
            ...copy,
            editButton: t("admin.courtOwnersTable.editButton"),
            closeDialog: t("admin.courtOwnersTable.closeDialog"),
            updateTitle: t("admin.updateTitle"),
            selectSport: t("admin.selectSport"),
            name: t("admin.courtName"),
            address: t("admin.address"),
            district: t("admin.district"),
            province: t("admin.province"),
            price: t("admin.price"),
            phone: t("admin.phone"),
            line: t("admin.line"),
            website: t("admin.website"),
            placeSearch: t("admin.placeSearch"),
            placeSearchHelper: t("admin.placeSearchHelper"),
            placeSearchNoResults: t("admin.placeSearchNoResults"),
            updateSubmit: t("admin.updateSubmit"),
            updateSubmitting: t("admin.updateSubmitting"),
            updateSuccess: t("admin.updateSuccess"),
            locationMissing: t("admin.locationMissing"),
          }}
        />
      </section>
    </AdminPortalShell>
  );
}
