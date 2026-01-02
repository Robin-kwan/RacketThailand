import Link from "next/link";
import { redirect } from "next/navigation";
import { CourtOwnerForm } from "@/components/admin/court-owner-form";
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

export default async function CourtOwnersPage({
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
    .select("status,display_name")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "admin") {
    redirect(buildLocalizedPath("/", locale));
  }

  const { data: courts } = await supabaseSelect<{
    id: string;
    name: string;
    province: string | null;
  }>("courts", {
    select: "id,name,province",
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

  const courtOptions =
    courts?.map((court) => ({
      value: court.id,
      label: court.province
        ? `${court.name} (${court.province})`
        : court.name,
    })) ?? [];

  const profileOptions =
    profiles?.map((owner) => ({
      value: owner.id,
      label: owner.display_name ?? owner.username ?? owner.id.slice(0, 6),
    })) ?? [];

  const copy = {
    title: t("admin.courtOwnersTitle"),
    subtitle: t("admin.courtOwnersSubtitle"),
    courtLabel: t("admin.courtLabel"),
    profileLabel: t("admin.profileLabel"),
    submit: t("admin.assignSubmit"),
    submitting: t("admin.submitting"),
    success: t("admin.assignSuccess"),
    error: t("admin.assignError"),
  };
  const canAssign = courtOptions.length > 0 && profileOptions.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Admin · Courts
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6">
            {canAssign ? (
              <CourtOwnerForm
                courts={courtOptions}
                profiles={profileOptions}
                copy={copy}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                {t("admin.courtOwnersEmpty")}
              </p>
            )}
          </div>
        </section>
        <section className="text-sm text-slate-500">
          <Link
            href={buildLocalizedPath("/admin", locale)}
            className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
          >
            {t("admin.backToPanel")}
          </Link>
        </section>
      </main>
    </div>
  );
}
