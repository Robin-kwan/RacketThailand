import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { InAppBrowserNotice } from "@/components/auth/in-app-browser-notice";
import { BaseCard } from "@/components/base-card";
import {
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildAuthPagePath,
  buildLocalizedAuthRedirectPath,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
  redirectTo?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const redirectTo = sanitizeAuthRedirectPath(resolvedParams?.redirectTo);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !user.is_anonymous) {
    redirect(buildLocalizedAuthRedirectPath(redirectTo, locale));
  }
  const t = await getTranslator(locale);
  const formCopy = {
    nameLabel: t("auth.nameLabel"),
    emailLabel: t("auth.emailLabel"),
    passwordLabel: t("auth.passwordLabel"),
    confirmPasswordLabel: t("auth.confirmPasswordLabel"),
    button: t("auth.signupButton"),
    agreeTerms: t("auth.agreeTerms"),
    verifyNotice: t("auth.verifyNotice"),
    passwordToggleShow: t("auth.passwordShow"),
    passwordToggleHide: t("auth.passwordHide"),
    passwordRequirements: t("auth.passwordRequirements"),
    passwordMismatch: t("auth.passwordMismatch"),
    passwordWeak: t("auth.passwordWeak"),
    emailExists: t("auth.emailExists"),
    namePlaceholder: t("auth.namePlaceholder"),
    googleButton: t("auth.signupGoogleButton"),
    lineButton: t("auth.signupLineButton"),
  };
  const inAppBrowserCopy = {
    title: t("auth.inAppBrowser.title"),
    body: t("auth.inAppBrowser.body"),
    copyLink: t("auth.inAppBrowser.copyLink"),
    copied: t("auth.inAppBrowser.copied"),
    dismiss: t("auth.inAppBrowser.dismiss"),
  };

  if (!t) {
    throw new Error("Translator unavailable");
  }

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="w-full rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <InAppBrowserNotice copy={inAppBrowserCopy} />
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {t("auth.signupTitle")}
          </h1>
          <p className="mt-3 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("auth.signupSubtitle")}
          </p>
          <SignupForm locale={locale} copy={formCopy} redirectTo={redirectTo} />
          <p className="mt-4 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("auth.switchToLogin")}{" "}
            <Link
              href={buildAuthPagePath("/login", locale, redirectTo)}
              className="font-semibold text-[var(--rt-primary)]"
            >
              {t("header.login")}
            </Link>
          </p>
        </BaseCard>
      </main>
    </div>
  );
}
