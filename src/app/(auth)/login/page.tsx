import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";

type SearchParams = {
  lang?: string;
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
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="w-full rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            {t("auth.loginTitle")}
          </h1>
          <LoginForm locale={locale} copy={formCopy} />
          <p className="mt-4 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("auth.switchToSignup")}{" "}
            <Link
              href={buildLocalizedPath("/signup", locale)}
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
