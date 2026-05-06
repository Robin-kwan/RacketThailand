import { redirect } from "next/navigation";
import { CourtAdminForm } from "@/components/admin/court-form";
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

export default async function DashboardAddCourtPage({
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
    redirect(buildLocalizedPath("/login", locale));
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const canManage =
    profile?.status === "court_manager" || profile?.status === "admin";
  if (!canManage) {
    redirect(buildLocalizedPath("/dashboard/court-requests", locale));
  }

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string;
  }>("sports", {
    select: "id,code,name",
    order: "code.asc",
  });

  const sportOptions =
    sports?.map((sport) => ({
      id: sport.id,
      label: sport.name ?? sport.code,
    })) ?? [];

  const copy = {
    title: t("admin.courtTitle"),
    subtitle: t("admin.courtSubtitle"),
    selectSport: t("admin.selectSport"),
    name: t("admin.courtName"),
    description: t("admin.description"),
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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 backdrop-blur">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Dashboard · Courts
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
        <div className="mt-6">
          <CourtAdminForm sports={sportOptions} copy={copy} />
        </div>
      </section>
    </main>
  );
}
