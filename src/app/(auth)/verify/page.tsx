import Link from "next/link";
import { redirect } from "next/navigation";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { VerificationWatcher } from "@/components/auth/verification-watcher";

type SearchParams = {
  lang?: string;
  email?: string;
  userId?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email_confirmed_at) {
    redirect(buildLocalizedPath("/", locale));
  }
  const email = resolvedParams?.email
    ? decodeURIComponent(resolvedParams.email)
    : "";
  const userId = resolvedParams?.userId
    ? decodeURIComponent(resolvedParams.userId)
    : undefined;

  return (
    <div className="rt-page relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(12,52,39,0.08),_transparent_65%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-20 pt-16 text-center md:px-10">
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white px-8 py-10"
        >
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            {t("auth.pendingTitle")}
          </h1>
          <p className="mt-3 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("auth.pendingDescription", { email: email || t("header.brand") })}
          </p>
          <div className="mt-6 flex flex-col gap-4 text-left text-[var(--foreground)]">
            <VerificationWatcher userId={userId} locale={locale} />
            {!userId && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {t("auth.pendingMissingUserId")}
              </p>
            )}
            {email && (
              <ResendVerificationButton
                email={email}
                label={t("auth.pendingResend")}
                successMessage={t("auth.pendingResendSuccess")}
                errorMessage={t("auth.pendingResendError")}
              />
            )}
          </div>
          <Link
            href={buildLocalizedPath("/login", locale)}
            className="mt-8 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-slate-500"
          >
            {t("auth.pendingBack")}
          </Link>
        </BaseCard>
      </main>
    </div>
  );
}
