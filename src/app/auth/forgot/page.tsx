import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BaseCard } from "@/components/base-card";
import {
  getTranslator,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";

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

export const metadata: Metadata = {
  title: "Forgot password | RacketThailand",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale: Locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const copy = {
    title: t("auth.forgot.title"),
    subtitle: t("auth.forgot.subtitle"),
    form: {
      emailLabel: t("auth.forgot.emailLabel"),
      emailPlaceholder: t("auth.forgot.emailPlaceholder"),
      submit: t("auth.forgot.submit"),
      submitting: t("auth.forgot.submitting"),
      success: t("auth.forgot.success"),
      helper: t("auth.forgot.helper"),
      cooldown: t("auth.forgot.cooldown", { time: "{time}" }),
      error: t("auth.forgot.error"),
    },
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 pb-20 pt-16 text-center md:px-8">
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {copy.subtitle}
          </p>
          <div className="mt-6">
            <ForgotPasswordForm copy={copy.form} />
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
