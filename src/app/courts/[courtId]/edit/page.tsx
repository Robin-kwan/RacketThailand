import { notFound, redirect } from "next/navigation";
import { CourtEditForm } from "@/components/admin/court-edit-form";
import { OwnershipAssignmentPanel } from "@/components/admin/ownership-assignment-panel";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import { SPORT_META } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildOpeningHoursEditorCopy } from "@/lib/opening-hours-editor-copy";
import { buildLineQrUploaderCopy } from "@/lib/line-qr-uploader-copy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import type { OpeningHoursEntry } from "@/lib/opening-hours";
import { fetchSportIdsByCourtId } from "@/server/courtSports";

type Params = { courtId: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
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

function formatProfileOption(profile: {
  id: string;
  username: string | null;
  display_name: string | null;
}) {
  const username = profile.username?.trim();
  const displayName = profile.display_name?.trim();
  return {
    id: profile.id,
    username,
    displayName,
    label:
      username && displayName
        ? `${username} - ${displayName}`
        : username ?? displayName ?? profile.id.slice(0, 8),
  };
}

export default async function EditCourtPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      buildAuthPagePath("/login", locale, `/courts/${resolvedParams.courtId}/edit`),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: courtRows } = await supabaseSelect<{
    id: string;
    name: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    district_id: number | null;
    province_id: number | null;
    description: string | null;
    price_note: string | null;
    opening_hours: OpeningHoursEntry[] | null;
    phone: string | null;
    line_id: string | null;
    website_url: string | null;
    created_by: string | null;
    latitude: string | null;
    longitude: string | null;
    google_place_id: string | null;
    line_qr_url: string | null;
  }>("courts", {
    select:
      "id,name,address,district,province,district_id,province_id,description,price_note,opening_hours,phone,line_id,website_url,created_by,latitude:lat,longitude:lng,google_place_id,line_qr_url",
    id: `eq.${resolvedParams.courtId}`,
    limit: "1",
  });
  const court = courtRows?.[0];
  if (!court) {
    notFound();
  }

  if (!isAdmin && court.created_by !== user.id) {
    redirect(buildLocalizedPath(`/courts/${court.id}`, locale));
  }

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string | null;
  }>("sports", {
    select: "id,code,name",
    order: "name.asc.nullslast",
  });

  const [{ data: photoRows }, courtSportIds, { data: ownerRows }] =
    await Promise.all([
    supabaseSelect<{
      id: string;
      image_url: string;
      is_primary: boolean | null;
    }>("court_photos", {
      select: "id,image_url,is_primary",
      court_id: `eq.${court.id}`,
      order: "is_primary.desc,created_at.asc",
    }),
    fetchSportIdsByCourtId(court.id),
    court.created_by
      ? supabaseSelect<{
          id: string;
          username: string | null;
          display_name: string | null;
        }>("profiles", {
          select: "id,username,display_name",
          id: `eq.${court.created_by}`,
          limit: "1",
        })
      : Promise.resolve({ data: [] }),
  ]);

  const primarySportId = courtSportIds[0] ?? "";
  const currentSportSlug =
    sports?.find((sport) => sport.id === primarySportId)?.code ?? undefined;

  const sportOptions =
    sports?.map((sport) => ({
      id: sport.id,
      label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
    })) ?? [];

  const formCourt = {
    id: court.id,
    sportId: primarySportId,
    sportIds: courtSportIds,
    name: court.name ?? "",
    description: court.description ?? "",
    address: court.address ?? "",
    district: court.district ?? "",
    province: court.province ?? "",
    districtId: court.district_id != null ? String(court.district_id) : "",
    provinceId: court.province_id != null ? String(court.province_id) : "",
    price_note: court.price_note ?? "",
    opening_hours: court.opening_hours ?? null,
    phone: court.phone ?? "",
    line_id: court.line_id ?? "",
    website_url: court.website_url ?? "",
    latitude: court.latitude ?? "",
    longitude: court.longitude ?? "",
    google_place_id: court.google_place_id ?? null,
    lineQrUrl: court.line_qr_url ?? null,
  };

  const copy = {
    title: t("admin.updateTitle"),
    subtitle: t("admin.updateSubtitle"),
    selectSport: t("admin.selectSport"),
    name: t("admin.courtName"),
    description: t("admin.description"),
    address: t("admin.address"),
    district: t("admin.district"),
    province: t("admin.province"),
    locationDetailsTitle: t("admin.locationDetailsTitle"),
    locationDetailsHelper: t("admin.locationDetailsHelper"),
    locationDetailsEmpty: t("admin.locationDetailsEmpty"),
    locationLockedBadge: t("admin.locationLockedBadge"),
    price: t("admin.price"),
    openingHours: t("admin.openingHours"),
    openingHoursEditor: buildOpeningHoursEditorCopy(t),
    openingHoursRequired: t("admin.openingHoursRequired"),
    phone: t("admin.phone"),
    line: t("admin.line"),
    lineQr: t("admin.lineQr"),
    lineQrUploader: buildLineQrUploaderCopy(t),
    website: t("admin.website"),
    placeSearch: t("admin.placeSearch"),
    placeSearchHelper: t("admin.placeSearchHelper"),
    placeSearchNoResults: t("admin.placeSearchNoResults"),
    placeAlreadyRegistered: t("admin.placeAlreadyRegistered"),
    placeExistingCourtLinkFallback: t("admin.placeExistingCourtLinkFallback"),
    submit: t("admin.updateSubmit"),
    submitting: t("admin.updateSubmitting"),
    success: t("admin.updateSuccess"),
    error: t("admin.error"),
    photos: t("admin.photos"),
    primaryPhoto: t("admin.primaryPhoto"),
    makePrimaryPhoto: t("admin.makePrimaryPhoto"),
    courtPhotoUploadError: t("admin.courtPhotoUploadError"),
    noChanges: t("admin.noChanges"),
    photoUploadHelper: t("admin.photoUploadHelper"),
    photoProcessError: t("admin.photoProcessError"),
    locationMissing: t("admin.locationMissing"),
    deleteSubmit: t("admin.deleteSubmit"),
    deleting: t("admin.deleting"),
    deleteSuccess: t("admin.deleteSuccess"),
    deleteError: t("admin.deleteError"),
    deleteConfirm: t("admin.deleteConfirm"),
    deleteCancel: t("admin.deleteCancel"),
  };
  const deleteRedirectHref = buildLocalizedPath(
    currentSportSlug ? `/${currentSportSlug}/court-finder` : "/",
    locale,
  );
  const ownerProfile = ownerRows?.[0] ? formatProfileOption(ownerRows[0]) : null;
  const ownershipCopy = {
    title: t("admin.ownership.courtTitle"),
    subtitle: t("admin.ownership.subtitle"),
    currentLabel: t("admin.ownership.currentLabel"),
    searchLabel: t("admin.ownership.searchLabel"),
    searchPlaceholder: t("admin.ownership.searchPlaceholder"),
    searching: t("admin.ownership.searching"),
    noResults: t("admin.ownership.noResults"),
    save: t("admin.ownership.save"),
    saving: t("admin.ownership.saving"),
    success: t("admin.ownership.success"),
    error: t("admin.ownership.error"),
    unchanged: t("admin.ownership.unchanged"),
    unassigned: t("admin.ownership.unassigned"),
  };

  return (
    <>
      <HeaderSportScope sportSlug={currentSportSlug} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <EntityDeleteButton
            endpoint={`/api/courts/${court.id}`}
            redirectHref={deleteRedirectHref}
            copy={{
              submit: copy.deleteSubmit,
              deleting: copy.deleting,
              success: copy.deleteSuccess,
              error: copy.deleteError,
              confirm: copy.deleteConfirm,
              cancel: copy.deleteCancel,
            }}
          />
        </div>
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 backdrop-blur">
          <h1 className="text-xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6">
            <CourtEditForm
              court={formCourt}
              sports={sportOptions}
              locale={locale}
              copy={copy}
              existingPhotos={photoRows ?? []}
            />
          </div>
        </section>
        {isAdmin && (
          <OwnershipAssignmentPanel
            entityType="court"
            entityId={court.id}
            currentProfile={ownerProfile}
            copy={ownershipCopy}
          />
        )}
      </main>
    </>
  );
}
