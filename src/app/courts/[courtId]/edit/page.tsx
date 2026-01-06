import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CourtEditForm } from "@/components/admin/court-edit-form";
import { HeaderSportScope } from "@/components/header-sport-scope";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import type { OpeningHoursEntry } from "@/lib/opening-hours";

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
    redirect(buildLocalizedPath("/login", locale));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: courtRows } = await supabaseSelect<{
    id: string;
    sport_id: string;
    name: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
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
      "id,sport_id,name,address,district,province,price_note,opening_hours,phone,line_id,website_url,created_by,latitude:lat,longitude:lng,google_place_id,line_qr_url",
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

  const { data: photoRows } = await supabaseSelect<{
    id: string;
    image_url: string;
    is_primary: boolean | null;
  }>("court_photos", {
    select: "id,image_url,is_primary",
    court_id: `eq.${court.id}`,
    order: "is_primary.desc,created_at.asc",
  });

  const currentSportSlug =
    sports?.find((sport) => sport.id === court.sport_id)?.code ?? undefined;

  const sportOptions =
    sports?.map((sport) => ({
      id: sport.id,
      label: sport.name ?? sport.code,
    })) ?? [];

  const formCourt = {
    id: court.id,
    sportId: court.sport_id,
    name: court.name ?? "",
    address: court.address ?? "",
    district: court.district ?? "",
    province: court.province ?? "",
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
    submit: t("admin.updateSubmit"),
    submitting: t("admin.updateSubmitting"),
    success: t("admin.updateSuccess"),
    error: t("admin.error"),
    photos: t("admin.photos"),
    locationMissing: t("admin.locationMissing"),
  };

  return (
    <>
      <HeaderSportScope sportSlug={currentSportSlug} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
      <div>
        <Link
          href={buildLocalizedPath(`/courts/${court.id}`, locale)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          ← {t("courtPage.back")}
        </Link>
      </div>
      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Courts · Edit
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
        <div className="mt-6">
          <CourtEditForm
            court={formCourt}
            sports={sportOptions}
            copy={copy}
            existingPhotos={photoRows ?? []}
          />
        </div>
      </section>
    </main>
    </>
  );
}
