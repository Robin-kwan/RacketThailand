import Link from "next/link";
import { redirect } from "next/navigation";
import { CourtSubmissionPolicyToggle } from "@/components/admin/court-submission-policy-toggle";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { getAllowPublicCourtPublish } from "@/lib/court-submission-policy";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

export default async function AdminPanel({
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
  const allowPublicCourtPublish = await getAllowPublicCourtPublish();

  const features = [
    {
      title: t("admin.panelFeatures.courts.title"),
      description: t("admin.panelFeatures.courts.description"),
      href: "/admin/courts",
    },
    {
      title: t("admin.panelFeatures.courtOwners.title"),
      description: t("admin.panelFeatures.courtOwners.description"),
      href: "/admin/court-owners",
    },
    {
      title: t("admin.panelFeatures.feedback.title"),
      description: t("admin.panelFeatures.feedback.description"),
      href: "/admin/feedback",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {t("admin.panelTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("admin.panelSubtitle")}
          </p>
        </section>
        <CourtSubmissionPolicyToggle
          initialAllowPublicCourtPublish={allowPublicCourtPublish}
          copy={{
            title: t("admin.courtSubmissionPolicy.title"),
            subtitle: t("admin.courtSubmissionPolicy.subtitle"),
            current: t("admin.courtSubmissionPolicy.current"),
            toggleLabel: t("admin.courtSubmissionPolicy.toggleLabel"),
            directMode: t("admin.courtSubmissionPolicy.directMode"),
            requestMode: t("admin.courtSubmissionPolicy.requestMode"),
            save: t("admin.courtSubmissionPolicy.save"),
            saving: t("admin.courtSubmissionPolicy.saving"),
            saved: t("admin.courtSubmissionPolicy.saved"),
            unsaved: t("admin.courtSubmissionPolicy.unsaved"),
            error: t("admin.courtSubmissionPolicy.error"),
          }}
        />
        <section className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={buildLocalizedPath(feature.href, locale)}
              className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {feature.description}
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold uppercase text-slate-500">
                {t("admin.open")}
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
