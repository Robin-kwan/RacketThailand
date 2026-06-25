import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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

export default async function LoginPage({
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
    emailLabel: t("auth.emailLabel"),
    passwordLabel: t("auth.passwordLabel"),
    rememberMe: t("auth.rememberMe"),
    forgotPassword: t("auth.forgotPassword"),
    button: t("auth.loginButton"),
    agreeTerms: t("auth.agreeTerms"),
    emailNotVerified: t("auth.emailNotVerified"),
    passwordToggleShow: t("auth.passwordShow"),
    passwordToggleHide: t("auth.passwordHide"),
    googleButton: t("auth.googleButton"),
    lineButton: t("auth.lineButton"),
    success: t("auth.loginSuccess"),
  };
  const inAppBrowserCopy = {
    title: t("auth.inAppBrowser.title"),
    body: t("auth.inAppBrowser.body"),
    copyLink: t("auth.inAppBrowser.copyLink"),
    copied: t("auth.inAppBrowser.copied"),
    dismiss: t("auth.inAppBrowser.dismiss"),
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="w-full rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <InAppBrowserNotice copy={inAppBrowserCopy} />
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {t("auth.loginTitle")}
          </h1>
          <LoginForm locale={locale} copy={formCopy} redirectTo={redirectTo} />
          <p className="mt-4 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("auth.switchToSignup")}{" "}
            <Link
              href={buildAuthPagePath("/signup", locale, redirectTo)}
              className="font-semibold text-[var(--rt-primary)]"
            >
              {t("header.signup")}
            </Link>
          </p>
        </BaseCard>
      </main>
    </div>
  );
}
