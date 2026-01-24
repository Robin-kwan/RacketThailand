import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
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
  title: "Reset password | RacketThailand",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale: Locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const copy = {
    title: t("auth.reset.title"),
    subtitle: t("auth.reset.subtitle"),
    form: {
      newLabel: t("auth.reset.newLabel"),
      confirmLabel: t("auth.reset.confirmLabel"),
      button: t("auth.reset.button"),
      updating: t("auth.reset.updating"),
      helper: t("auth.reset.helper"),
      success: t("auth.reset.success"),
      sessionMissing: t("auth.reset.sessionMissing"),
      errorMismatch: t("auth.reset.errorMismatch"),
      errorWeak: t("auth.reset.errorWeak"),
    },
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 pb-20 pt-16 text-center md:px-8">
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {copy.subtitle}
          </p>
          <div className="mt-6">
            <ResetPasswordForm copy={copy.form} />
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
